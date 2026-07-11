import { ORPCError } from "@orpc/server";
import { z } from "zod";

import {
	type AdminRepository,
	AdminTargetNotFoundError,
	DuplicatePresetSlugError,
	drizzleAdminRepository,
	InvalidRoleTransitionError,
} from "#/features/admin/admin-repository";
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

export function createAdminRouter(repository: AdminRepository) {
	return {
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

export const adminRouter = createAdminRouter(drizzleAdminRepository);
