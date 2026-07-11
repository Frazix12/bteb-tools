import { getTableColumns } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import {
	aiKeyRotationState,
	aiProviderKey,
	aiUsageEvent,
	preset,
	user,
} from "./schema";

describe("admin schema", () => {
	test("exposes role, presets, and usage accounting columns", () => {
		expect(Object.keys(getTableColumns(user))).toContain("role");
		expect(Object.keys(getTableColumns(preset))).toEqual(
			expect.arrayContaining(["slug", "type", "data", "enabled"]),
		);
		expect(Object.keys(getTableColumns(aiUsageEvent))).toEqual(
			expect.arrayContaining([
				"ownerId",
				"model",
				"inputTokens",
				"outputTokens",
				"costMicros",
				"pricingVersion",
				"outcome",
			]),
		);
	});
});

describe("AI provider key schema", () => {
	test("exposes encrypted key, health, audit, and timestamp columns", () => {
		expect(getTableColumns(aiProviderKey)).toMatchObject({
			encryptedSecret: expect.any(Object),
			fingerprint: expect.any(Object),
			maskedSuffix: expect.any(Object),
			validationStatus: expect.any(Object),
			cooldownUntil: expect.any(Object),
			createdBy: expect.any(Object),
			updatedBy: expect.any(Object),
			createdAt: expect.any(Object),
			updatedAt: expect.any(Object),
		});
	});

	test("exposes provider rotation cursor columns", () => {
		expect(getTableColumns(aiKeyRotationState)).toMatchObject({
			provider: expect.any(Object),
			cursor: expect.any(Object),
		});
	});
});
