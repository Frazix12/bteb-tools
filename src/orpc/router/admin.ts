import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { env } from "#/env";
import {
	type AdminRepository,
	AdminTargetNotFoundError,
	DuplicatePresetSlugError,
	drizzleAdminRepository,
	InvalidRoleTransitionError,
} from "#/features/admin/admin-repository";
import { classifyGeminiError } from "#/features/ai-keys/gemini-errors";
import { createProductionGeminiCredentialValidator } from "#/features/ai-keys/gemini-validation";
import {
	createGeminiKeyPool,
	type GeminiKeyPool,
} from "#/features/ai-keys/key-pool";
import {
	AiKeyNotFoundError,
	DuplicateAiKeyError,
	drizzleAiKeyRepository,
} from "#/features/ai-keys/repository";
import type { AiKeyRepository, PublicAiKey } from "#/features/ai-keys/types";
import { adminProcedure } from "#/orpc/middleware/auth";
import {
	CoverPageDataSchema,
	IndexSheetDataSchema,
} from "#/orpc/schemas/document";

const page = z.object({
	page: z.number().int().min(1),
	pageSize: z.number().int().min(1).max(100),
});
const id = z.object({ id: z.string().uuid() });
const apiKey = z.string().trim().min(1).max(500);
const keyCreate = z.object({
	label: z.string().trim().min(1).max(100),
	apiKey,
});
const presetBase = z.object({
	slug: z
		.string()
		.trim()
		.min(1)
		.max(80)
		.regex(
			/^[a-z0-9]+(?:-[a-z0-9]+)*$/,
			"Use lowercase letters, numbers, and single hyphens.",
		),
	title: z.string().trim().min(1),
	description: z.string(),
	enabled: z.boolean(),
});
const presetWrite = z.discriminatedUnion("type", [
	presetBase.extend({
		type: z.literal("cover_page"),
		data: CoverPageDataSchema,
	}),
	presetBase.extend({
		type: z.literal("index_sheet"),
		data: IndexSheetDataSchema,
	}),
]);

function mapped(error: unknown): never {
	if (error instanceof DuplicateAiKeyError)
		throw new ORPCError("CONFLICT", { message: "AI key already exists." });
	if (error instanceof AiKeyNotFoundError)
		throw new ORPCError("NOT_FOUND", { message: "AI key not found." });
	if (error instanceof DuplicatePresetSlugError)
		throw new ORPCError("CONFLICT", { message: "Preset slug already exists." });
	if (error instanceof AdminTargetNotFoundError)
		throw new ORPCError("NOT_FOUND", { message: "Admin target not found." });
	if (error instanceof InvalidRoleTransitionError)
		throw new ORPCError("FORBIDDEN", {
			message: "The protected bootstrap account cannot be demoted.",
		});
	throw error;
}

type AdminDependencies = {
	repository: AdminRepository;
	keyRepository: AiKeyRepository;
	keyPool: GeminiKeyPool;
};

function publicKey(key: PublicAiKey): PublicAiKey {
	return {
		id: key.id,
		provider: key.provider,
		label: key.label,
		maskedSuffix: key.maskedSuffix,
		enabled: key.enabled,
		validationStatus: key.validationStatus,
		cooldownUntil: key.cooldownUntil,
		lastCheckedAt: key.lastCheckedAt,
		lastUsedAt: key.lastUsedAt,
		lastSuccessAt: key.lastSuccessAt,
		lastFailureAt: key.lastFailureAt,
		failureCode: key.failureCode,
		failureMessage: key.failureMessage,
	};
}

export function createAdminRouter({
	repository,
	keyRepository,
	keyPool,
}: AdminDependencies) {
	return {
		aiKeys: {
			list: adminProcedure
				.input(z.object({}))
				.handler(async () => (await keyRepository.list()).map(publicKey)),
			create: adminProcedure
				.input(keyCreate)
				.handler(async ({ input, context }) => {
					try {
						const row = await keyRepository.create({
							...input,
							actorId: context.user.id,
						});
						return publicKey(await keyPool.validateOne(row.id));
					} catch (error) {
						mapped(error);
					}
				}),
			replace: adminProcedure
				.input(id.extend({ apiKey }))
				.handler(async ({ input, context }) => {
					try {
						const existing = (await keyRepository.list()).find(
							(key) => key.id === input.id,
						);
						if (!existing) throw new AiKeyNotFoundError();
						await keyRepository.replace(input.id, {
							label: existing.label,
							apiKey: input.apiKey,
							actorId: context.user.id,
						});
						return publicKey(await keyPool.validateOne(input.id));
					} catch (error) {
						mapped(error);
					}
				}),
			setEnabled: adminProcedure
				.input(id.extend({ enabled: z.boolean() }))
				.handler(async ({ input, context }) => {
					try {
						return publicKey(
							await keyRepository.setEnabled(
								input.id,
								input.enabled,
								context.user.id,
							),
						);
					} catch (error) {
						mapped(error);
					}
				}),
			delete: adminProcedure.input(id).handler(async ({ input }) => {
				try {
					await keyRepository.delete(input.id);
					return { deleted: true };
				} catch (error) {
					mapped(error);
				}
			}),
			validate: adminProcedure.input(id).handler(async ({ input }) => {
				try {
					return publicKey(await keyPool.validateOne(input.id));
				} catch (error) {
					mapped(error);
				}
			}),
			validateAll: adminProcedure
				.input(z.object({}))
				.handler(async () => (await keyPool.validateAll()).map(publicKey)),
		},
		users: {
			list: adminProcedure
				.input(page)
				.handler(({ input }) => repository.listUsers(input)),
			setRole: adminProcedure
				.input(
					z.object({
						userId: z.string().min(1),
						role: z.enum(["user", "admin"]),
					}),
				)
				.handler(async ({ input, context }) => {
					try {
						return await repository.setUserRole(
							context.user.id,
							input.userId,
							input.role,
						);
					} catch (error) {
						mapped(error);
					}
				}),
		},
		usage: {
			summary: adminProcedure
				.input(
					z.object({
						datePage: z.number().int().min(1).default(1),
						userPage: z.number().int().min(1).default(1),
						pageSize: z.number().int().min(1).max(100).default(20),
						from: z.coerce.date().optional(),
						to: z.coerce.date().optional(),
					}),
				)
				.handler(({ input }) => repository.usageSummary(input)),
		},
		data: {
			summary: adminProcedure
				.input(z.object({}))
				.handler(() => repository.dataSummary()),
			listDocuments: adminProcedure
				.input(page)
				.handler(({ input }) => repository.listDocuments(input)),
			deleteDocument: adminProcedure.input(id).handler(async ({ input }) => {
				try {
					await repository.deleteDocument(input.id);
					return { deleted: true };
				} catch (error) {
					mapped(error);
				}
			}),
		},
		presets: {
			list: adminProcedure
				.input(page)
				.handler(({ input }) => repository.listPresets(input)),
			create: adminProcedure
				.input(presetWrite)
				.handler(async ({ input, context }) => {
					try {
						return await repository.createPreset(input, context.user.id);
					} catch (error) {
						mapped(error);
					}
				}),
			update: adminProcedure
				.input(id.and(presetWrite))
				.handler(async ({ input, context }) => {
					const { id: presetId, ...write } = input;
					try {
						return await repository.updatePreset(
							presetId,
							write,
							context.user.id,
						);
					} catch (error) {
						mapped(error);
					}
				}),
			setEnabled: adminProcedure
				.input(id.extend({ enabled: z.boolean() }))
				.handler(async ({ input, context }) => {
					try {
						return await repository.setPresetEnabled(
							input.id,
							input.enabled,
							context.user.id,
						);
					} catch (error) {
						mapped(error);
					}
				}),
			delete: adminProcedure.input(id).handler(async ({ input }) => {
				try {
					await repository.deletePreset(input.id);
					return { deleted: true };
				} catch (error) {
					mapped(error);
				}
			}),
		},
	};
}

const productionKeyPool = createGeminiKeyPool({
	repo: drizzleAiKeyRepository,
	getFallbackKey: () => env.GEMINI_API_KEY,
	now: () => new Date(),
	classifier: classifyGeminiError,
	validateCredential: createProductionGeminiCredentialValidator(
		env.GEMINI_MODEL,
	),
});
export const adminRouter = createAdminRouter({
	repository: drizzleAdminRepository,
	keyRepository: drizzleAiKeyRepository,
	keyPool: productionKeyPool,
});
