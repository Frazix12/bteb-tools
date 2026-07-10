import { z } from "zod";

const text = z.string().max(5_000);
const dateOrEmpty = z.union([z.literal(""), z.iso.date()]);

export const IndexEntrySchema = z.object({
	name: text,
	issueDate: dateOrEmpty,
	submitDate: dateOrEmpty,
	pageNo: z.string().max(100),
});

export const IndexSheetDataSchema = z.object({
	schemaVersion: z.literal(1),
	exportedAt: z.iso.datetime(),
	title: z.string().max(200),
	rowsPerPage: z.literal(10),
	showPageNo: z.boolean(),
	entries: z.array(IndexEntrySchema).max(200),
});

export const SubmittedBySchema = z.object({
	name: text,
	regNo: z.string().max(200),
	roll: z.string().max(200),
	subjectName: text,
	subjectCode: z.string().max(200),
	session: z.string().max(200),
	semester: z.string().max(200),
});

export const SubmittedToSchema = z.object({
	name: text,
	designation: text,
	department: text,
});

export const LogoDataUrlSchema = z.union([
	z.literal(""),
	z.string().regex(/^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/),
]);

export const CoverPageDataSchema = z.object({
	schemaVersion: z.literal(1),
	exportedAt: z.iso.datetime(),
	type: z.literal("cover-page"),
	instituteName: text,
	instituteShort: z.string().max(500),
	department: text,
	docType: z.string().max(500),
	logoDataUrl: LogoDataUrlSchema,
	submittedBy: SubmittedBySchema,
	submittedTo: SubmittedToSchema,
});

export type IndexSheetData = z.infer<typeof IndexSheetDataSchema>;
export type CoverPageData = z.infer<typeof CoverPageDataSchema>;
export type DocumentData = IndexSheetData | CoverPageData;
