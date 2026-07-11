import { describe, expect, test, vi } from "vitest";

import { createAiUsageRepository } from "./usage-repository";

describe("AI usage repository", () => {
	test("persists only accounting metadata", async () => {
		const insert = vi.fn().mockResolvedValue(undefined);
		const repository = createAiUsageRepository(insert);
		await repository.record({
			ownerId: "owner-1",
			provider: "google",
			model: "gemini-3.1-flash-lite",
			inputTokens: 12,
			outputTokens: 4,
			outcome: "success",
			createdAt: new Date("2026-07-11T00:00:00Z"),
		});
		const row = insert.mock.calls[0]?.[0];
		expect(row).toMatchObject({ costMicros: 9n, pricingVersion: "2026-07-11" });
		for (const privateKey of ["text", "prompt", "patch"]) {
			expect(row).not.toHaveProperty(privateKey);
		}
	});

	test("preserves unknown token metadata as null", async () => {
		const insert = vi.fn().mockResolvedValue(undefined);
		await createAiUsageRepository(insert).record({
			ownerId: "owner-1",
			provider: "google",
			model: "gemini-3.1-flash-lite",
			inputTokens: null,
			outputTokens: null,
			outcome: "provider_error",
			createdAt: new Date(),
		});
		expect(insert).toHaveBeenCalledWith(
			expect.objectContaining({
				inputTokens: null,
				outputTokens: null,
				costMicros: 0n,
			}),
		);
	});
});
