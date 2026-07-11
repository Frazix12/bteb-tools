export interface AiGenerationUsage {
	provider: string;
	model: string;
	inputTokens: number | null;
	outputTokens: number | null;
}

export const PRICING_VERSION = "2026-07-11";

// Standard paid-tier text rates, USD micros per 1M tokens. Verified 2026-07-11:
// https://ai.google.dev/gemini-api/docs/pricing
const MODEL_RATES = {
	"gemini-3.1-flash-lite": { input: 250_000n, output: 1_500_000n },
	"gemini-2.5-flash-lite": { input: 100_000n, output: 400_000n },
	"gemini-2.5-flash": { input: 300_000n, output: 2_500_000n },
} as const;

export function estimateCostMicros(usage: AiGenerationUsage) {
	const rates = MODEL_RATES[usage.model as keyof typeof MODEL_RATES];
	if (!rates) return { costMicros: 0n, pricingVersion: PRICING_VERSION };
	const input = BigInt(Math.max(0, usage.inputTokens ?? 0));
	const output = BigInt(Math.max(0, usage.outputTokens ?? 0));
	return {
		costMicros: (input * rates.input + output * rates.output) / 1_000_000n,
		pricingVersion: PRICING_VERSION,
	};
}
