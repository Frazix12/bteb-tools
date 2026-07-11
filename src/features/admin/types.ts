import type { DocumentType } from "#/features/documents/types";
import type { CoverPageData, IndexSheetData } from "#/orpc/schemas/document";
export type Page<T> = {
	items: T[];
	total: number;
	page: number;
	pageSize: number;
};
export type AdminUser = {
	id: string;
	name: string | null;
	email: string;
	role: "user" | "admin";
	documentCount: number;
};
export type AdminDocument = {
	id: string;
	title: string;
	ownerEmail: string;
	type: DocumentType;
	updatedAt: Date;
};
export type AdminPreset = {
	id: string;
	slug: string;
	title: string;
	description: string;
	type: DocumentType;
	data: unknown;
	enabled: boolean;
};
type PresetBase = {
	slug: string;
	title: string;
	description: string;
	enabled: boolean;
};
export type PresetInput =
	| (PresetBase & { type: "cover_page"; data: CoverPageData })
	| (PresetBase & { type: "index_sheet"; data: IndexSheetData });
export type Usage = {
	totals: {
		events: number | string | null;
		inputTokens: number | string | null;
		outputTokens: number | string | null;
		costMicros: number | string | null;
	};
	byModel: unknown[];
};
export type Summary = { users: number; documents: number; presets: number };
export type Message = {
	error?: boolean;
	text: string;
	fields?: Partial<Record<keyof PresetInput | string, string>>;
} | null;
export type PageKind = "users" | "documents" | "presets";
