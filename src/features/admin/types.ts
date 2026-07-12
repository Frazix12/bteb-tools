import type { PublicAiKey } from "#/features/ai-keys/types";
import type { DocumentType } from "#/features/documents/types";
import type { CoverPageData, IndexSheetData } from "#/orpc/schemas/document";
export type AdminAiKey = PublicAiKey;
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
	createdAt: Date;
	documentCount: number;
	aiRequests: number;
	inputTokens: number | string | null;
	outputTokens: number | string | null;
	costMicros: number | string | null;
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
	byModel: {
		provider: string;
		model: string;
		events: number | string;
		inputTokens: number | string | null;
		outputTokens: number | string | null;
		costMicros: number | string | null;
	}[];
	byDate: {
		date: string;
		events: number | string;
		inputTokens: number | string | null;
		outputTokens: number | string | null;
		costMicros: number | string | null;
	}[];
	byUser: {
		ownerId: string;
		name: string;
		email: string;
		events: number | string;
		inputTokens: number | string | null;
		outputTokens: number | string | null;
		costMicros: number | string | null;
	}[];
	byOutcome: {
		outcome: string;
		events: number | string;
		costMicros: number | string | null;
	}[];
	datePage: number;
	userPage: number;
	pageSize: number;
	dateTotal: number;
	userTotal: number;
};
export type Summary = {
	users: number;
	documents: number;
	presets: number;
	enabledPresets: number;
	disabledPresets: number;
	aiRequests: number;
};
export type Message = {
	error?: boolean;
	text: string;
	fields?: Partial<Record<keyof PresetInput | string, string>>;
} | null;
export type PageKind = "users" | "documents" | "presets";
