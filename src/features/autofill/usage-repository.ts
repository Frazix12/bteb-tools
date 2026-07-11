import { type AiGenerationUsage, estimateCostMicros } from "./pricing";

export type AiUsageOutcome =
	| "success"
	| "no_meaningful_fields"
	| "provider_error";

export interface AiUsageEvent extends AiGenerationUsage {
	ownerId: string;
	outcome: AiUsageOutcome;
	createdAt: Date;
}

export interface AiUsageRepository {
	record(event: AiUsageEvent): Promise<void>;
}

type UsageRow = Omit<AiUsageEvent, "inputTokens" | "outputTokens"> & {
	inputTokens: bigint;
	outputTokens: bigint;
	costMicros: bigint;
	pricingVersion: string;
};

export function createAiUsageRepository(
	insert: (row: UsageRow) => Promise<void>,
): AiUsageRepository {
	return {
		async record(event) {
			const pricing = estimateCostMicros(event);
			await insert({
				ownerId: event.ownerId,
				provider: event.provider,
				model: event.model,
				inputTokens: BigInt(event.inputTokens ?? 0),
				outputTokens: BigInt(event.outputTokens ?? 0),
				outcome: event.outcome,
				createdAt: event.createdAt,
				...pricing,
			});
		},
	};
}

export const drizzleAiUsageRepository = createAiUsageRepository(async (row) => {
	const [{ db }, { aiUsageEvent }] = await Promise.all([
		import("#/db"),
		import("#/db/schema"),
	]);
	await db.insert(aiUsageEvent).values(row);
});
