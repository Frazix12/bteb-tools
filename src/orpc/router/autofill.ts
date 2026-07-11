import { ORPCError } from "@orpc/server";
import { z } from "zod";

import {
	extractAutofill,
	NoMeaningfulAutofillFieldsError,
	ProviderAutofillError,
} from "#/features/autofill/extract";
import { consumeAutofillQuota } from "#/features/autofill/rate-limit";
import {
	type AiUsageOutcome,
	type AiUsageRepository,
	drizzleAiUsageRepository,
} from "#/features/autofill/usage-repository";
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
	usageRepository?: AiUsageRepository;
}

export function createAutofillRouter(dependencies: AutofillRouterDependencies) {
	return {
		extract: protectedProcedure
			.input(AutofillInputSchema)
			.handler(async ({ context, input }) => {
				const record = async (
					usage: Omit<Parameters<AiUsageRepository["record"]>[0], "outcome">,
					outcome: AiUsageOutcome,
				) => {
					try {
						await dependencies.usageRepository?.record({ ...usage, outcome });
					} catch (error) {
						console.error("Failed to record AI usage", error);
					}
				};
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
					const result = await dependencies.extract(input.type, input.text);
					await record(
						{
							ownerId: context.user.id,
							...result.usage,
							createdAt: new Date(),
						},
						"success",
					);
					return result;
				} catch (error) {
					if (error instanceof NoMeaningfulAutofillFieldsError) {
						await record(
							{
								ownerId: context.user.id,
								...error.usage,
								createdAt: new Date(),
							},
							"no_meaningful_fields",
						);
						throw new ORPCError("UNPROCESSABLE_CONTENT", {
							message: error.message,
						});
					}
					if (error instanceof ProviderAutofillError) {
						await record(
							{
								ownerId: context.user.id,
								...error.usage,
								createdAt: new Date(),
							},
							"provider_error",
						);
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
	usageRepository: drizzleAiUsageRepository,
});
