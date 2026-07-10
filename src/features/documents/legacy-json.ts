import { z } from "zod";
import type { CoverPageData, IndexSheetData } from "#/orpc/schemas/document";
import {
	CoverPageDataSchema,
	IndexSheetDataSchema,
} from "#/orpc/schemas/document";

const emptyString = z.string().catch("");
const legacyIndexSchema = z.object({
	schemaVersion: z.literal(1).catch(1),
	exportedAt: z.iso.datetime().catch("1970-01-01T00:00:00.000Z"),
	title: z.string().catch("INDEX"),
	rowsPerPage: z.literal(10).catch(10),
	showPageNo: z.boolean().catch(false),
	entries: z.array(
		z.object({
			name: emptyString,
			issueDate: emptyString,
			submitDate: emptyString,
			pageNo: emptyString,
		}),
	),
});

const legacyCoverSchema = z.object({
	schemaVersion: z.literal(1).catch(1),
	exportedAt: z.iso.datetime().catch("1970-01-01T00:00:00.000Z"),
	type: z.literal("cover-page"),
	instituteName: emptyString,
	instituteShort: emptyString,
	department: emptyString,
	docType: z.string().catch("Assignment"),
	logoDataUrl: emptyString,
	submittedBy: z
		.object({
			name: emptyString,
			regNo: emptyString,
			roll: emptyString,
			subjectName: emptyString,
			subjectCode: emptyString,
			session: emptyString,
			semester: emptyString,
		})
		.catch({
			name: "",
			regNo: "",
			roll: "",
			subjectName: "",
			subjectCode: "",
			session: "",
			semester: "",
		}),
	submittedTo: z
		.object({
			name: emptyString,
			designation: emptyString,
			department: emptyString,
		})
		.catch({ name: "", designation: "", department: "" }),
});

type ParseFailure = { ok: false; message: string };
type ParseSuccess<T> = { ok: true; data: T };

export function parseLegacyDocument(
	text: string,
	expectedType: "index_sheet",
): ParseSuccess<IndexSheetData> | ParseFailure;
export function parseLegacyDocument(
	text: string,
	expectedType: "cover_page",
): ParseSuccess<CoverPageData> | ParseFailure;
export function parseLegacyDocument(
	text: string,
	expectedType: "index_sheet" | "cover_page",
): ParseSuccess<IndexSheetData | CoverPageData> | ParseFailure {
	let input: unknown;
	try {
		input = JSON.parse(text);
	} catch {
		return { ok: false, message: "Could not read that file as JSON." };
	}

	const legacySchema =
		expectedType === "index_sheet" ? legacyIndexSchema : legacyCoverSchema;
	const canonicalSchema =
		expectedType === "index_sheet" ? IndexSheetDataSchema : CoverPageDataSchema;
	const legacy = legacySchema.safeParse(input);
	const canonical = legacy.success
		? canonicalSchema.safeParse(legacy.data)
		: { success: false as const };

	if (!canonical.success) {
		return {
			ok: false,
			message: `This file is not a valid ${
				expectedType === "index_sheet" ? "index sheet" : "cover page"
			} export.`,
		};
	}

	return { ok: true, data: canonical.data };
}

export function serializeLegacyDocument(
	data: IndexSheetData | CoverPageData,
	exportedAt = new Date().toISOString(),
) {
	return JSON.stringify({ ...data, exportedAt }, null, 2);
}
