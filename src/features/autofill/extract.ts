import { chat } from "@tanstack/ai";
import { createGeminiChat, type GeminiTextModel } from "@tanstack/ai-gemini";
import { z } from "zod";

import type { DocumentType } from "#/features/documents/types";
import { buildAutofillPrompt } from "./prompts";

const optionalText = (maximum: number) => z.string().max(maximum).optional();
const optionalDate = z.union([z.literal(""), z.iso.date()]).optional();

export const IndexAutofillPatchSchema = z
	.object({
		title: optionalText(200),
		showPageNo: z.boolean().optional(),
		entries: z
			.array(
				z.strictObject({
					name: optionalText(5_000),
					issueDate: optionalDate,
					submitDate: optionalDate,
					pageNo: optionalText(100),
				}),
			)
			.max(200)
			.optional(),
	})
	.strict();

export const CoverAutofillPatchSchema = z.strictObject({
	instituteName: optionalText(5_000),
	instituteShort: optionalText(500),
	department: optionalText(5_000),
	docType: optionalText(500),
	submittedBy: z
		.strictObject({
			name: optionalText(5_000),
			regNo: optionalText(200),
			roll: optionalText(200),
			subjectName: optionalText(5_000),
			subjectCode: optionalText(200),
			session: optionalText(200),
			semester: optionalText(200),
		})
		.optional(),
	submittedTo: z
		.strictObject({
			name: optionalText(5_000),
			designation: optionalText(5_000),
			department: optionalText(5_000),
		})
		.optional(),
});

export type IndexAutofillPatch = z.infer<typeof IndexAutofillPatchSchema>;
export type CoverAutofillPatch = z.infer<typeof CoverAutofillPatchSchema>;
export type AutofillPatch = IndexAutofillPatch | CoverAutofillPatch;

export interface AutofillResult {
	type: DocumentType;
	patch: AutofillPatch;
	extractedFieldCount: number;
	warnings: string[];
}

interface GenerateRequest {
	type: DocumentType;
	prompt: string;
	schema: typeof IndexAutofillPatchSchema | typeof CoverAutofillPatchSchema;
}

export type AutofillGenerator = (request: GenerateRequest) => Promise<unknown>;

export class ProviderAutofillError extends Error {
	constructor() {
		super("AI extraction is temporarily unavailable.");
	}
}

export class NoMeaningfulAutofillFieldsError extends Error {
	constructor() {
		super("No meaningful fields could be extracted.");
	}
}

function compact(value: unknown): unknown {
	if (typeof value === "string") return value.trim() || undefined;
	if (Array.isArray(value)) {
		return value
			.map(compact)
			.filter((item) => item !== undefined && item !== null);
	}
	if (value && typeof value === "object") {
		const entries = Object.entries(value)
			.map(([key, item]) => [key, compact(item)] as const)
			.filter(([, item]) => item !== undefined && item !== null);
		return entries.length ? Object.fromEntries(entries) : undefined;
	}
	return value;
}

function countLeaves(value: unknown): number {
	if (Array.isArray(value))
		return value.reduce((total, item) => total + countLeaves(item), 0);
	if (value && typeof value === "object") {
		return Object.values(value).reduce<number>(
			(total, item) => total + countLeaves(item),
			0,
		);
	}
	return value === undefined || value === null || value === "" ? 0 : 1;
}

const geminiGenerate: AutofillGenerator = async ({ prompt, schema }) => {
	const { env } = await import("#/env");
	if (!env.GEMINI_API_KEY) throw new ProviderAutofillError();
	const adapter = createGeminiChat(
		env.GEMINI_MODEL as GeminiTextModel,
		env.GEMINI_API_KEY,
	);
	return chat({
		adapter,
		messages: [{ role: "user", content: prompt }],
		outputSchema: schema,
	});
};

export function createAutofillExtractor(
	generate: AutofillGenerator = geminiGenerate,
) {
	return async (type: DocumentType, text: string): Promise<AutofillResult> => {
		const schema =
			type === "index_sheet"
				? IndexAutofillPatchSchema
				: CoverAutofillPatchSchema;
		let parsed: AutofillPatch;
		try {
			const generated = await generate({
				type,
				prompt: buildAutofillPrompt(type, text),
				schema,
			});
			parsed = schema.parse(generated);
		} catch {
			throw new ProviderAutofillError();
		}

		const patch = (compact(parsed) ?? {}) as AutofillPatch;
		const extractedFieldCount = countLeaves(patch);
		const hasNamedExperiment =
			type === "index_sheet" &&
			Array.isArray((patch as IndexAutofillPatch).entries) &&
			(patch as IndexAutofillPatch).entries?.some((entry) =>
				Boolean(entry.name),
			);
		if (
			(type === "cover_page" && extractedFieldCount < 2) ||
			(type === "index_sheet" && !hasNamedExperiment)
		) {
			throw new NoMeaningfulAutofillFieldsError();
		}

		return { type, patch, extractedFieldCount, warnings: [] };
	};
}

export const extractAutofill = createAutofillExtractor();
