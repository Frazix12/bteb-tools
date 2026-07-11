import {
	and,
	asc,
	count,
	desc,
	eq,
	gte,
	inArray,
	lte,
	sql,
	sum,
} from "drizzle-orm";

import { db } from "#/db";
import { aiUsageEvent, documents, preset, user } from "#/db/schema";
import { canChangeRole } from "#/features/admin/authorization";
import type { DocumentType } from "#/features/documents/types";

export class AdminTargetNotFoundError extends Error {
	override name = "AdminTargetNotFoundError";
}
export class DuplicatePresetSlugError extends Error {
	override name = "DuplicatePresetSlugError";
}
export class InvalidRoleTransitionError extends Error {
	override name = "InvalidRoleTransitionError";
}

export type PageInput = { page: number; pageSize: number };
export type UsageInput = PageInput & { from?: Date; to?: Date };
export type PresetWrite = {
	slug: string;
	title: string;
	description: string;
	type: DocumentType;
	data: unknown;
	enabled: boolean;
};

export interface AdminRepository {
	listUsers(input: PageInput): Promise<unknown>;
	setUserRole(
		actorId: string,
		targetId: string,
		role: "user" | "admin",
	): Promise<unknown>;
	usageSummary(input?: UsageInput): Promise<unknown>;
	dataSummary(): Promise<unknown>;
	listDocuments(input: PageInput): Promise<unknown>;
	deleteDocument(id: string): Promise<void>;
	listPresets(input: PageInput): Promise<unknown>;
	createPreset(input: PresetWrite, actorId: string): Promise<unknown>;
	updatePreset(
		id: string,
		input: PresetWrite,
		actorId: string,
	): Promise<unknown>;
	setPresetEnabled(
		id: string,
		enabled: boolean,
		actorId: string,
	): Promise<unknown>;
	deletePreset(id: string): Promise<void>;
}

type Memory = {
	users: { id: string; email: string; role: "user" | "admin" }[];
};
export function createAdminRepository(
	store: Memory,
): Pick<AdminRepository, "setUserRole"> {
	return {
		async setUserRole(actorId, targetId, role) {
			const target = store.users.find((item) => item.id === targetId);
			if (!target) throw new AdminTargetNotFoundError();
			if (
				role !== "admin" &&
				!canChangeRole({ actorId, targetId, targetEmail: target.email })
			)
				throw new InvalidRoleTransitionError();
			target.role = role;
			return target;
		},
	};
}

const offset = ({ page, pageSize }: PageInput) => (page - 1) * pageSize;
const duplicate = (error: unknown) =>
	typeof error === "object" &&
	error !== null &&
	"code" in error &&
	(error as { code?: string }).code === "23505";

export const drizzleAdminRepository: AdminRepository = {
	async listUsers(input) {
		const [rows, [{ value: total }]] = await Promise.all([
			db
				.select({
					id: user.id,
					name: user.name,
					email: user.email,
					role: user.role,
					createdAt: user.createdAt,
				})
				.from(user)
				.orderBy(desc(user.createdAt))
				.limit(input.pageSize)
				.offset(offset(input)),
			db.select({ value: count() }).from(user),
		]);
		const ids = rows.map((row) => row.id);
		if (!ids.length)
			return { items: [], total, page: input.page, pageSize: input.pageSize };
		const [documentCounts, usage] = await Promise.all([
			db
				.select({ ownerId: documents.ownerId, value: count() })
				.from(documents)
				.where(inArray(documents.ownerId, ids))
				.groupBy(documents.ownerId),
			db
				.select({
					ownerId: aiUsageEvent.ownerId,
					aiRequests: count(),
					inputTokens: sum(aiUsageEvent.inputTokens),
					outputTokens: sum(aiUsageEvent.outputTokens),
					costMicros: sum(aiUsageEvent.costMicros),
				})
				.from(aiUsageEvent)
				.where(inArray(aiUsageEvent.ownerId, ids))
				.groupBy(aiUsageEvent.ownerId),
		]);
		const docsByOwner = new Map(
			documentCounts.map((x) => [x.ownerId, x.value]),
		);
		const usageByOwner = new Map(usage.map((x) => [x.ownerId, x]));
		return {
			items: rows.map((row) => ({
				...row,
				documentCount: docsByOwner.get(row.id) ?? 0,
				aiRequests: usageByOwner.get(row.id)?.aiRequests ?? 0,
				inputTokens: usageByOwner.get(row.id)?.inputTokens ?? null,
				outputTokens: usageByOwner.get(row.id)?.outputTokens ?? null,
				costMicros: usageByOwner.get(row.id)?.costMicros ?? "0",
			})),
			total,
			page: input.page,
			pageSize: input.pageSize,
		};
	},
	async setUserRole(actorId, targetId, role) {
		return db.transaction(async (tx) => {
			const [target] = await tx
				.select({ id: user.id, email: user.email })
				.from(user)
				.where(eq(user.id, targetId))
				.limit(1);
			if (!target) throw new AdminTargetNotFoundError();
			if (
				role !== "admin" &&
				!canChangeRole({ actorId, targetId, targetEmail: target.email })
			)
				throw new InvalidRoleTransitionError();
			const [row] = await tx
				.update(user)
				.set({ role })
				.where(eq(user.id, targetId))
				.returning({ id: user.id, role: user.role });
			if (!row) throw new AdminTargetNotFoundError();
			return row;
		});
	},
	async usageSummary(input = { page: 1, pageSize: 20 }) {
		const conditions = [
			input.from ? gte(aiUsageEvent.createdAt, input.from) : undefined,
			input.to ? lte(aiUsageEvent.createdAt, input.to) : undefined,
		].filter(Boolean);
		const where = conditions.length ? and(...conditions) : undefined;
		const totals = await db
			.select({
				events: count(),
				inputTokens: sum(aiUsageEvent.inputTokens),
				outputTokens: sum(aiUsageEvent.outputTokens),
				costMicros: sum(aiUsageEvent.costMicros),
			})
			.from(aiUsageEvent)
			.where(where);
		const byModel = await db
			.select({
				provider: aiUsageEvent.provider,
				model: aiUsageEvent.model,
				events: count(),
				inputTokens: sum(aiUsageEvent.inputTokens),
				outputTokens: sum(aiUsageEvent.outputTokens),
				costMicros: sum(aiUsageEvent.costMicros),
			})
			.from(aiUsageEvent)
			.where(where)
			.groupBy(aiUsageEvent.provider, aiUsageEvent.model)
			.orderBy(asc(aiUsageEvent.provider), asc(aiUsageEvent.model));
		const day = sql<string>`date(${aiUsageEvent.createdAt})`;
		const [byDate, byUser, byOutcome] = await Promise.all([
			db
				.select({
					date: day,
					events: count(),
					costMicros: sum(aiUsageEvent.costMicros),
				})
				.from(aiUsageEvent)
				.where(where)
				.groupBy(day)
				.orderBy(desc(day))
				.limit(input.pageSize)
				.offset(offset(input)),
			db
				.select({
					ownerId: user.id,
					name: user.name,
					email: user.email,
					events: count(),
					inputTokens: sum(aiUsageEvent.inputTokens),
					outputTokens: sum(aiUsageEvent.outputTokens),
					costMicros: sum(aiUsageEvent.costMicros),
				})
				.from(aiUsageEvent)
				.innerJoin(user, eq(user.id, aiUsageEvent.ownerId))
				.where(where)
				.groupBy(user.id)
				.orderBy(desc(count()))
				.limit(input.pageSize)
				.offset(offset(input)),
			db
				.select({
					outcome: aiUsageEvent.outcome,
					events: count(),
					costMicros: sum(aiUsageEvent.costMicros),
				})
				.from(aiUsageEvent)
				.where(where)
				.groupBy(aiUsageEvent.outcome)
				.orderBy(asc(aiUsageEvent.outcome))
				.limit(20),
		]);
		return {
			totals: totals[0],
			byModel,
			byDate,
			byUser,
			byOutcome,
			page: input.page,
			pageSize: input.pageSize,
		};
	},
	async dataSummary() {
		const [[users], [docs], [presets], [enabled], [disabled], [requests]] =
			await Promise.all([
				db.select({ count: count() }).from(user),
				db.select({ count: count() }).from(documents),
				db.select({ count: count() }).from(preset),
				db
					.select({ count: count() })
					.from(preset)
					.where(eq(preset.enabled, true)),
				db
					.select({ count: count() })
					.from(preset)
					.where(eq(preset.enabled, false)),
				db.select({ count: count() }).from(aiUsageEvent),
			]);
		return {
			users: users.count,
			documents: docs.count,
			presets: presets.count,
			enabledPresets: enabled.count,
			disabledPresets: disabled.count,
			aiRequests: requests.count,
		};
	},
	async listDocuments(input) {
		const [items, [{ value: total }]] = await Promise.all([
			db
				.select({
					id: documents.id,
					ownerId: documents.ownerId,
					ownerName: user.name,
					ownerEmail: user.email,
					type: documents.type,
					title: documents.title,
					createdAt: documents.createdAt,
					updatedAt: documents.updatedAt,
				})
				.from(documents)
				.innerJoin(user, eq(user.id, documents.ownerId))
				.orderBy(desc(documents.updatedAt))
				.limit(input.pageSize)
				.offset(offset(input)),
			db.select({ value: count() }).from(documents),
		]);
		return { items, total, page: input.page, pageSize: input.pageSize };
	},
	async deleteDocument(id) {
		const rows = await db
			.delete(documents)
			.where(eq(documents.id, id))
			.returning({ id: documents.id });
		if (!rows.length) throw new AdminTargetNotFoundError();
	},
	async listPresets(input) {
		const [items, [{ value: total }]] = await Promise.all([
			db
				.select({
					id: preset.id,
					slug: preset.slug,
					title: preset.title,
					description: preset.description,
					type: preset.type,
					data: preset.data,
					enabled: preset.enabled,
					createdBy: preset.createdBy,
					updatedBy: preset.updatedBy,
					createdAt: preset.createdAt,
					updatedAt: preset.updatedAt,
				})
				.from(preset)
				.orderBy(asc(preset.title))
				.limit(input.pageSize)
				.offset(offset(input)),
			db.select({ value: count() }).from(preset),
		]);
		return { items, total, page: input.page, pageSize: input.pageSize };
	},
	async createPreset(input, actorId) {
		try {
			const [row] = await db
				.insert(preset)
				.values({ ...input, createdBy: actorId, updatedBy: actorId })
				.returning();
			return row;
		} catch (error) {
			if (duplicate(error)) throw new DuplicatePresetSlugError();
			throw error;
		}
	},
	async updatePreset(id, input, actorId) {
		try {
			const [row] = await db
				.update(preset)
				.set({ ...input, updatedBy: actorId, updatedAt: new Date() })
				.where(eq(preset.id, id))
				.returning();
			if (!row) throw new AdminTargetNotFoundError();
			return row;
		} catch (error) {
			if (duplicate(error)) throw new DuplicatePresetSlugError();
			throw error;
		}
	},
	async setPresetEnabled(id, enabled, actorId) {
		const [row] = await db
			.update(preset)
			.set({ enabled, updatedBy: actorId, updatedAt: new Date() })
			.where(eq(preset.id, id))
			.returning();
		if (!row) throw new AdminTargetNotFoundError();
		return row;
	},
	async deletePreset(id) {
		const rows = await db
			.delete(preset)
			.where(eq(preset.id, id))
			.returning({ id: preset.id });
		if (!rows.length) throw new AdminTargetNotFoundError();
	},
};
