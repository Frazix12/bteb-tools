import { and, asc, eq } from "drizzle-orm";

import { db } from "#/db";
import { preset } from "#/db/schema";
import type { DocumentType } from "#/features/documents/types";

export interface PresetSummary {
	slug: string;
	title: string;
	description: string;
	type: DocumentType;
}

export interface PresetRecord extends PresetSummary {
	data: unknown;
	enabled: boolean;
}

export interface PresetSeedInput extends PresetSummary {
	data: unknown;
	enabled?: boolean;
}

export interface PresetRepository {
	listEnabled(): Promise<PresetSummary[]>;
	findEnabled(slug: string, type: DocumentType): Promise<PresetRecord | null>;
	upsertSeed(input: PresetSeedInput): Promise<void>;
}

interface MemoryStore {
	rows: PresetRecord[];
}

export function createPresetRepository(store: MemoryStore): PresetRepository {
	return {
		async listEnabled() {
			return store.rows
				.filter((row) => row.enabled)
				.map(({ slug, title, description, type }) => ({
					slug,
					title,
					description,
					type,
				}));
		},
		async findEnabled(slug, type) {
			return (
				store.rows.find(
					(row) => row.enabled && row.slug === slug && row.type === type,
				) ?? null
			);
		},
		async upsertSeed(input) {
			const record = { ...input, enabled: input.enabled ?? true };
			const index = store.rows.findIndex((row) => row.slug === input.slug);
			if (index === -1) store.rows.push(record);
			else store.rows[index] = record;
		},
	};
}

export const drizzlePresetRepository: PresetRepository = {
	async listEnabled() {
		return db
			.select({
				slug: preset.slug,
				title: preset.title,
				description: preset.description,
				type: preset.type,
			})
			.from(preset)
			.where(eq(preset.enabled, true))
			.orderBy(asc(preset.title));
	},
	async findEnabled(slug, type) {
		const [row] = await db
			.select({
				slug: preset.slug,
				title: preset.title,
				description: preset.description,
				type: preset.type,
				data: preset.data,
				enabled: preset.enabled,
			})
			.from(preset)
			.where(
				and(
					eq(preset.slug, slug),
					eq(preset.type, type),
					eq(preset.enabled, true),
				),
			)
			.limit(1);
		return row ?? null;
	},
	async upsertSeed(input) {
		await db
			.insert(preset)
			.values({ ...input, enabled: input.enabled ?? true })
			.onConflictDoUpdate({
				target: preset.slug,
				set: {
					title: input.title,
					description: input.description,
					type: input.type,
					data: input.data,
					enabled: input.enabled ?? true,
					updatedAt: new Date(),
				},
			});
	},
};
