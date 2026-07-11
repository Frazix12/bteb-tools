import { describe, expect, test } from "vitest";

import { estimateCostMicros } from "./pricing";

describe("AI pricing", () => {
	test("uses the versioned Gemini 3.1 Flash-Lite standard text rates", () => {
		expect(
			estimateCostMicros({
				provider: "google",
				model: "gemini-3.1-flash-lite",
				inputTokens: 1_000_000,
				outputTokens: 1_000_000,
			}),
		).toEqual({ costMicros: 1_750_000n, pricingVersion: "2026-07-11" });
	});

	test("prices unknown models and unavailable usage at zero", () => {
		expect(
			estimateCostMicros({
				provider: "google",
				model: "unknown",
				inputTokens: null,
				outputTokens: null,
			}).costMicros,
		).toBe(0n);
	});
});
