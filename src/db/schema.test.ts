import { getTableColumns } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { aiUsageEvent, preset, user } from "./schema";

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
