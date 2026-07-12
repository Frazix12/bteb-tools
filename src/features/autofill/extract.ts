import { chat } from "@tanstack/ai";
import { createGeminiChat, type GeminiTextModel } from "@tanstack/ai-gemini";
import { z } from "zod";
import type { GeminiKeyPool } from "#/features/ai-keys/key-pool";
import type { DocumentType } from "#/features/documents/types";
import type { AiGenerationUsage } from "./pricing";
import { buildAutofillPrompt } from "./prompts";

const optionalText = (maximum: number) => z.string().max(maximum).optional();
const optionalDate = z
	.string()
	.refine(
		(value) => value === "" || z.iso.date().safeParse(value).success,
		"Expected an empty value or ISO date",
	)
	.optional();

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

const providerText = z.string().optional();

export const IndexAutofillProviderSchema = z.strictObject({
	title: providerText,
	showPageNo: z.boolean().optional(),
	entries: z
		.array(
			z.strictObject({
				name: providerText,
				issueDate: providerText,
				submitDate: providerText,
				pageNo: providerText,
			}),
		)
		.optional(),
});

export const CoverAutofillProviderSchema = z.strictObject({
	instituteName: providerText,
	instituteShort: providerText,
	department: providerText,
	docType: providerText,
	submittedBy: z
		.strictObject({
			name: providerText,
			regNo: providerText,
			roll: providerText,
			subjectName: providerText,
			subjectCode: providerText,
			session: providerText,
			semester: providerText,
		})
		.optional(),
	submittedTo: z
		.strictObject({
			name: providerText,
			designation: providerText,
			department: providerText,
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
	usage: AiGenerationUsage;
}

interface GenerateRequest {
	type: DocumentType;
	prompt: string;
	schema:
		| typeof IndexAutofillProviderSchema
		| typeof CoverAutofillProviderSchema;
}

export interface AutofillGeneration {
	value: unknown;
	usage: AiGenerationUsage;
}
export type AutofillGenerator = (
	request: GenerateRequest,
) => Promise<AutofillGeneration | unknown>;

export class ProviderAutofillError extends Error {
	constructor(
		public readonly usage: AiGenerationUsage = {
			provider: "google",
			model: "unknown",
			inputTokens: null,
			outputTokens: null,
		},
	) {
		super("AI extraction is temporarily unavailable.");
	}
}

export class NoMeaningfulAutofillFieldsError extends Error {
	constructor(public readonly usage: AiGenerationUsage) {
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

type UsageCaptureOptions = {
	middleware: Array<{
		onUsage: (
			context: unknown,
			info: { promptTokens: number; completionTokens: number },
		) => void;
	}>;
};

export async function captureGeminiGeneration(
	model: string,
	run: (options: UsageCaptureOptions) => Promise<unknown>,
): Promise<AutofillGeneration> {
	let tokens = {
		inputTokens: null as number | null,
		outputTokens: null as number | null,
	};
	const options: UsageCaptureOptions = {
		middleware: [
			{
				onUsage: (_context, info) => {
					tokens = {
						inputTokens: info.promptTokens,
						outputTokens: info.completionTokens,
					};
				},
			},
		],
	};
	try {
		const value = await run(options);
		return {
			value,
			usage: { provider: "google", model, ...tokens },
		};
	} catch {
		throw new ProviderAutofillError({ provider: "google", model, ...tokens });
	}
}

type GeminiGeneratorDependencies = {
	pool: Pick<GeminiKeyPool, "run">;
	model: string;
	createAdapter: (model: GeminiTextModel, apiKey: string) => unknown;
	runChat: (
		adapter: unknown,
		request: GenerateRequest,
		onUsage: (inputTokens: number, outputTokens: number) => void,
	) => Promise<unknown>;
};

const failedAttemptUsage = new WeakMap<object, AiGenerationUsage>();

export function createGeminiAutofillGenerator({
	pool,
	model,
	createAdapter,
	runChat,
}: GeminiGeneratorDependencies): AutofillGenerator {
	const generateWithGeminiKey = async (
		apiKey: string,
		request: GenerateRequest,
	): Promise<AutofillGeneration> => {
		let inputTokens: number | null = null;
		let outputTokens: number | null = null;
		const adapter = createAdapter(model as GeminiTextModel, apiKey);
		let value: unknown;
		try {
			value = await runChat(adapter, request, (input, output) => {
				inputTokens = input;
				outputTokens = output;
			});
		} catch (error) {
			if (typeof error === "object" && error !== null) {
				failedAttemptUsage.set(error, {
					provider: "google",
					model,
					inputTokens,
					outputTokens,
				});
			}
			throw error;
		}
		return {
			value,
			usage: { provider: "google", model, inputTokens, outputTokens },
		};
	};
	return (request) =>
		pool.run((apiKey) => generateWithGeminiKey(apiKey, request));
}

let defaultGenerator: Promise<AutofillGenerator> | undefined;
async function getDefaultGeminiGenerator(): Promise<AutofillGenerator> {
	defaultGenerator ??= (async () => {
		const { env } = await import("#/env");
		const { classifyGeminiError } = await import(
			"#/features/ai-keys/gemini-errors"
		);
		const { createGeminiKeyPool } = await import("#/features/ai-keys/key-pool");
		const { drizzleAiKeyRepository } = await import(
			"#/features/ai-keys/repository"
		);
		const pool = createGeminiKeyPool({
			repo: drizzleAiKeyRepository,
			getFallbackKey: () => env.GEMINI_API_KEY,
			now: () => new Date(),
			classifier: classifyGeminiError,
			validateCredential: async () => undefined,
		});
		return createGeminiAutofillGenerator({
			pool,
			model: env.GEMINI_MODEL,
			createAdapter: createGeminiChat,
			runChat: (adapter, { prompt, schema }, onUsage) =>
				chat({
					adapter: adapter as ReturnType<typeof createGeminiChat>,
					messages: [{ role: "user", content: prompt }],
					outputSchema: schema,
					middleware: [
						{
							name: "capture-usage",
							onUsage: (_context, info) =>
								onUsage(info.promptTokens, info.completionTokens),
						},
					],
				}),
		});
	})();
	return defaultGenerator;
}

const geminiGenerate: AutofillGenerator = async (request) => {
	try {
		return await (await getDefaultGeminiGenerator())(request);
	} catch (error) {
		if (error instanceof ProviderAutofillError) throw error;
		throw new ProviderAutofillError(
			typeof error === "object" && error !== null
				? failedAttemptUsage.get(error)
				: undefined,
		);
	}
};

export function createAutofillExtractor(
	generate: AutofillGenerator = geminiGenerate,
) {
	return async (type: DocumentType, text: string): Promise<AutofillResult> => {
		const validationSchema =
			type === "index_sheet"
				? IndexAutofillPatchSchema
				: CoverAutofillPatchSchema;
		const providerSchema =
			type === "index_sheet"
				? IndexAutofillProviderSchema
				: CoverAutofillProviderSchema;
		let parsed: AutofillPatch;
		let usage: AiGenerationUsage | null = null;
		try {
			const generated = await generate({
				type,
				prompt: buildAutofillPrompt(type, text),
				schema: providerSchema,
			});
			const response = generated as Partial<AutofillGeneration>;
			usage = response.usage ?? {
				provider: "google",
				model: "unknown",
				inputTokens: null,
				outputTokens: null,
			};
			parsed = validationSchema.parse(
				Object.hasOwn(response, "value") ? response.value : generated,
			);
		} catch (error) {
			throw error instanceof ProviderAutofillError
				? error
				: new ProviderAutofillError(usage ?? undefined);
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
			throw new NoMeaningfulAutofillFieldsError(usage);
		}

		return { type, patch, extractedFieldCount, warnings: [], usage };
	};
}

export const extractAutofill = createAutofillExtractor();
