import { ORPCError } from "@orpc/server";
import { z } from "zod";

import {
	extractAutofill,
	NoMeaningfulAutofillFieldsError,
} from "#/features/autofill/extract";
import { consumeAutofillQuota } from "#/features/autofill/rate-limit";
import type { DocumentType } from "#/features/documents/types";
import { protectedProcedure } from "#/orpc/middleware/auth";
import { DocumentTypeSchema } from "#/orpc/schemas/document";

const AutofillInputSchema = z.object({
	type: DocumentTypeSchema,
	text: z.string().trim().min(10).max(20_000),
});

interface AutofillRouterDependencies {
	consumeQuota: typeof consumeAutofillQuota;
	extract: (
		type: DocumentType,
		text: string,
	) => ReturnType<typeof extractAutofill>;
}

export function createAutofillRouter(dependencies: AutofillRouterDependencies) {
	return {
		extract: protectedProcedure
			.input(AutofillInputSchema)
			.handler(async ({ context, input }) => {
				const quota = await dependencies.consumeQuota(
					context.user.id,
					new Date(),
				);
				if (!quota.allowed) {
					throw new ORPCError("TOO_MANY_REQUESTS", {
						message: "AI autofill quota exceeded.",
						data: { retryAt: quota.retryAt?.toISOString() ?? null },
					});
				}

				try {
					return await dependencies.extract(input.type, input.text);
				} catch (error) {
					if (error instanceof NoMeaningfulAutofillFieldsError) {
						throw new ORPCError("UNPROCESSABLE_CONTENT", {
							message: error.message,
						});
					}
					throw new ORPCError("INTERNAL_SERVER_ERROR", {
						message: "AI extraction is temporarily unavailable.",
					});
				}
			}),
	};
}

export const autofillRouter = createAutofillRouter({
	consumeQuota: consumeAutofillQuota,
	extract: extractAutofill,
});
