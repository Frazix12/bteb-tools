import { and, asc, eq, isNull, lte, or, sql } from "drizzle-orm";

import { db } from "#/db";
import { aiKeyRotationState, aiProviderKey } from "#/db/schema";
import { env } from "#/env";
import { createKeyCipher, type KeyCipher } from "#/features/ai-keys/crypto";
import type {
	AiKeyRepository,
	AiKeyWrite,
	KeyHealthUpdate,
	PublicAiKey,
} from "#/features/ai-keys/types";

export class AiKeyNotFoundError extends Error {
	override name = "AiKeyNotFoundError";
}
export class DuplicateAiKeyError extends Error {
	override name = "DuplicateAiKeyError";
}
export class AiKeyEncryptionNotConfiguredError extends Error {
	override name = "AiKeyEncryptionNotConfiguredError";
}

type Database = typeof db;
const provider = "google" as const;
const duplicate = (error: unknown) =>
	typeof error === "object" &&
	error !== null &&
	"code" in error &&
	(error as { code?: string }).code === "23505";
const requireCipher = (cipher?: KeyCipher): KeyCipher => {
	if (!cipher) throw new AiKeyEncryptionNotConfiguredError();
	return cipher;
};
const healthNotNewerThan = (attemptAt: Date) =>
	and(
		or(
			isNull(aiProviderKey.lastSuccessAt),
			lte(aiProviderKey.lastSuccessAt, attemptAt),
		),
		or(
			isNull(aiProviderKey.lastFailureAt),
			lte(aiProviderKey.lastFailureAt, attemptAt),
		),
	);

const publicSelection = {
	id: aiProviderKey.id,
	provider: aiProviderKey.provider,
	label: aiProviderKey.label,
	maskedSuffix: aiProviderKey.maskedSuffix,
	enabled: aiProviderKey.enabled,
	validationStatus: aiProviderKey.validationStatus,
	cooldownUntil: aiProviderKey.cooldownUntil,
	lastCheckedAt: aiProviderKey.lastValidatedAt,
	lastUsedAt: aiProviderKey.lastUsedAt,
	lastSuccessAt: aiProviderKey.lastSuccessAt,
	lastFailureAt: aiProviderKey.lastFailureAt,
	failureCode: aiProviderKey.lastFailureCode,
	failureMessage: aiProviderKey.lastFailureMessage,
};

const toPublic = (row: Record<string, unknown>): PublicAiKey => ({
	...(row as Omit<PublicAiKey, "provider">),
	provider,
});

export function createDrizzleAiKeyRepository(
	database: Database,
	cipher?: KeyCipher,
): AiKeyRepository {
	const readPublic = async (id: string) => {
		const [row] = await database
			.select(publicSelection)
			.from(aiProviderKey)
			.where(eq(aiProviderKey.id, id))
			.limit(1);
		if (!row) throw new AiKeyNotFoundError();
		return toPublic(row);
	};
	const ensureExists = async (id: string) => {
		const [row] = await database
			.select({ id: aiProviderKey.id })
			.from(aiProviderKey)
			.where(eq(aiProviderKey.id, id))
			.limit(1);
		if (!row) throw new AiKeyNotFoundError();
	};
	const encryptedValues = (input: AiKeyWrite) => {
		const configured = requireCipher(cipher);
		return {
			provider,
			label: input.label,
			encryptedSecret: configured.encrypt(input.apiKey),
			fingerprint: configured.fingerprint(input.apiKey),
			maskedSuffix: configured.mask(input.apiKey),
			updatedBy: input.actorId,
		};
	};
	return {
		async list() {
			const rows = await database
				.select(publicSelection)
				.from(aiProviderKey)
				.orderBy(asc(aiProviderKey.label), asc(aiProviderKey.id));
			return rows.map((row) => toPublic(row));
		},
		async create(input) {
			requireCipher(cipher);
			try {
				const [row] = await database
					.insert(aiProviderKey)
					.values({
						...encryptedValues(input),
						createdBy: input.actorId,
					})
					.returning({ id: aiProviderKey.id });
				return readPublic(row.id);
			} catch (error) {
				if (duplicate(error)) throw new DuplicateAiKeyError();
				throw error;
			}
		},
		async replace(id, input) {
			try {
				const [row] = await database
					.update(aiProviderKey)
					.set({
						...encryptedValues(input),
						credentialRevision: sql`${aiProviderKey.credentialRevision} + 1`,
						validationStatus: "unchecked",
						cooldownUntil: null,
						lastFailureCode: null,
						lastFailureMessage: null,
					})
					.where(eq(aiProviderKey.id, id))
					.returning({ id: aiProviderKey.id });
				if (!row) throw new AiKeyNotFoundError();
				return readPublic(id);
			} catch (error) {
				if (duplicate(error)) throw new DuplicateAiKeyError();
				throw error;
			}
		},
		async setEnabled(id, enabled, actorId) {
			const [row] = await database
				.update(aiProviderKey)
				.set({ enabled, updatedBy: actorId })
				.where(eq(aiProviderKey.id, id))
				.returning({ id: aiProviderKey.id });
			if (!row) throw new AiKeyNotFoundError();
			return readPublic(id);
		},
		async delete(id) {
			const [row] = await database
				.delete(aiProviderKey)
				.where(eq(aiProviderKey.id, id))
				.returning({ id: aiProviderKey.id });
			if (!row) throw new AiKeyNotFoundError();
		},
		async getForValidation(id) {
			const configured = requireCipher(cipher);
			const [row] = await database
				.select({
					id: aiProviderKey.id,
					encryptedSecret: aiProviderKey.encryptedSecret,
					credentialRevision: aiProviderKey.credentialRevision,
				})
				.from(aiProviderKey)
				.where(eq(aiProviderKey.id, id))
				.limit(1);
			if (!row) throw new AiKeyNotFoundError();
			return {
				id: row.id,
				apiKey: configured.decrypt(row.encryptedSecret),
				credentialRevision: row.credentialRevision,
			};
		},
		async selectCandidates(now) {
			const configured = requireCipher(cipher);
			const selected = await database.transaction(async (tx) => {
				await tx
					.insert(aiKeyRotationState)
					.values({ provider })
					.onConflictDoNothing();
				const locked = await tx.execute(
					sql`SELECT cursor FROM ai_key_rotation_state WHERE provider = ${provider} FOR UPDATE`,
				);
				const cursor = BigInt(
					(locked.rows[0] as { cursor?: string | bigint } | undefined)
						?.cursor ?? 0,
				);
				const rows = await tx
					.select({
						id: aiProviderKey.id,
						encryptedSecret: aiProviderKey.encryptedSecret,
						credentialRevision: aiProviderKey.credentialRevision,
					})
					.from(aiProviderKey)
					.where(
						and(
							eq(aiProviderKey.provider, provider),
							eq(aiProviderKey.enabled, true),
							or(
								eq(aiProviderKey.validationStatus, "valid"),
								and(
									eq(aiProviderKey.validationStatus, "transient_failure"),
									or(
										isNull(aiProviderKey.cooldownUntil),
										lte(aiProviderKey.cooldownUntil, now),
									),
								),
							),
						),
					)
					.orderBy(asc(aiProviderKey.id));
				if (!rows.length) return [];
				const start = Number(cursor % BigInt(rows.length));
				await tx
					.update(aiKeyRotationState)
					.set({ cursor: cursor + 1n })
					.where(eq(aiKeyRotationState.provider, provider));
				return [...rows.slice(start), ...rows.slice(0, start)];
			});
			return selected.map((row) => ({
				id: row.id,
				apiKey: configured.decrypt(row.encryptedSecret),
				credentialRevision: row.credentialRevision,
			}));
		},
		async recordSuccess(id, expectedRevision, now) {
			const [row] = await database
				.update(aiProviderKey)
				.set({
					validationStatus: "valid",
					cooldownUntil: null,
					lastUsedAt: now,
					lastSuccessAt: now,
					lastFailureAt: null,
					lastFailureCode: null,
					lastFailureMessage: null,
				})
				.where(
					and(
						eq(aiProviderKey.id, id),
						eq(aiProviderKey.credentialRevision, expectedRevision),
						healthNotNewerThan(now),
					),
				)
				.returning({ id: aiProviderKey.id });
			if (!row) await ensureExists(id);
		},
		async recordValidationSuccess(id, expectedRevision, now) {
			const [row] = await database
				.update(aiProviderKey)
				.set({
					enabled: true,
					validationStatus: "valid",
					cooldownUntil: null,
					lastSuccessAt: now,
					lastValidatedAt: now,
					lastFailureAt: null,
					lastFailureCode: null,
					lastFailureMessage: null,
				})
				.where(
					and(
						eq(aiProviderKey.id, id),
						eq(aiProviderKey.credentialRevision, expectedRevision),
						healthNotNewerThan(now),
					),
				)
				.returning({ id: aiProviderKey.id });
			if (!row) await ensureExists(id);
		},
		async recordValidationFailure(
			id,
			expectedRevision,
			update: KeyHealthUpdate,
			now,
		) {
			const [row] = await database
				.update(aiProviderKey)
				.set({
					enabled: update.enabled,
					validationStatus: update.validationStatus,
					cooldownUntil: update.cooldownUntil,
					lastValidatedAt: now,
					lastFailureAt: now,
					lastFailureCode: update.failureCode,
					lastFailureMessage: update.failureMessage,
				})
				.where(
					and(
						eq(aiProviderKey.id, id),
						eq(aiProviderKey.credentialRevision, expectedRevision),
						healthNotNewerThan(now),
					),
				)
				.returning({ id: aiProviderKey.id });
			if (!row) await ensureExists(id);
		},
		async recordFailure(id, expectedRevision, update: KeyHealthUpdate, now) {
			const [row] = await database
				.update(aiProviderKey)
				.set({
					enabled: update.enabled,
					validationStatus: update.validationStatus,
					cooldownUntil: update.cooldownUntil,
					lastUsedAt: now,
					lastFailureAt: now,
					lastFailureCode: update.failureCode,
					lastFailureMessage: update.failureMessage,
				})
				.where(
					and(
						eq(aiProviderKey.id, id),
						eq(aiProviderKey.credentialRevision, expectedRevision),
						healthNotNewerThan(now),
					),
				)
				.returning({ id: aiProviderKey.id });
			if (!row) await ensureExists(id);
		},
	};
}

export const drizzleAiKeyRepository = createDrizzleAiKeyRepository(
	db,
	env.AI_KEY_ENCRYPTION_SECRET
		? createKeyCipher(env.AI_KEY_ENCRYPTION_SECRET)
		: undefined,
);
