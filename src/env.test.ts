import { describe, expect, test } from "vitest";
import { serverEnvSchema } from "./env-schema";

describe("server environment schema", () => {
	test("accepts encryption secrets of at least 32 characters", () => {
		expect(
			serverEnvSchema.AI_KEY_ENCRYPTION_SECRET.safeParse("a".repeat(32))
				.success,
		).toBe(true);
	});

	test("rejects short non-empty encryption secrets", () => {
		expect(
			serverEnvSchema.AI_KEY_ENCRYPTION_SECRET.safeParse("too-short").success,
		).toBe(false);
	});
});
