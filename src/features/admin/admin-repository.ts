import { asc, count, desc, eq, sum } from "drizzle-orm";

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
	usageSummary(): Promise<unknown>;
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
					documentCount: count(documents.id),
				})
				.from(user)
				.leftJoin(documents, eq(documents.ownerId, user.id))
				.groupBy(user.id)
				.orderBy(desc(user.createdAt))
				.limit(input.pageSize)
				.offset(offset(input)),
			db.select({ value: count() }).from(user),
		]);
		return { items: rows, total, page: input.page, pageSize: input.pageSize };
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
	async usageSummary() {
		const totals = await db
			.select({
				events: count(),
				inputTokens: sum(aiUsageEvent.inputTokens),
				outputTokens: sum(aiUsageEvent.outputTokens),
				costMicros: sum(aiUsageEvent.costMicros),
			})
			.from(aiUsageEvent);
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
			.groupBy(aiUsageEvent.provider, aiUsageEvent.model)
			.orderBy(asc(aiUsageEvent.provider), asc(aiUsageEvent.model));
		return { totals: totals[0], byModel };
	},
	async dataSummary() {
		const [[users], [docs], [presets]] = await Promise.all([
			db.select({ count: count() }).from(user),
			db.select({ count: count() }).from(documents),
			db.select({ count: count() }).from(preset),
		]);
		return {
			users: users.count,
			documents: docs.count,
			presets: presets.count,
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
		await db.transaction(async (tx) => {
			const rows = await tx
				.delete(documents)
				.where(eq(documents.id, id))
				.returning({ id: documents.id });
			if (!rows.length) throw new AdminTargetNotFoundError();
		});
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
		await db.transaction(async (tx) => {
			const rows = await tx
				.delete(preset)
				.where(eq(preset.id, id))
				.returning({ id: preset.id });
			if (!rows.length) throw new AdminTargetNotFoundError();
		});
	},
};
