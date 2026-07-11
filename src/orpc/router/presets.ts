import { ORPCError } from "@orpc/server";
import { z } from "zod";

import {
	drizzlePresetRepository,
	type PresetRepository,
} from "#/features/presets/preset-repository";
import { protectedProcedure } from "#/orpc/middleware/auth";
import {
	CoverPageDataSchema,
	DocumentTypeSchema,
	IndexSheetDataSchema,
} from "#/orpc/schemas/document";

export function createPresetRouter(repository: PresetRepository) {
	const list = protectedProcedure
		.input(z.object({}))
		.handler(() => repository.listEnabled());
	const getEnabled = protectedProcedure
		.input(
			z.object({ slug: z.string().trim().min(1), type: DocumentTypeSchema }),
		)
		.handler(async ({ input }) => {
			const row = await repository.findEnabled(input.slug, input.type);
			if (!row)
				throw new ORPCError("NOT_FOUND", { message: "Preset not found." });
			const data =
				input.type === "cover_page"
					? CoverPageDataSchema.parse(row.data)
					: IndexSheetDataSchema.parse(row.data);
			return { ...row, data };
		});
	return { list, getEnabled };
}

export const presetRouter = createPresetRouter(drizzlePresetRepository);
