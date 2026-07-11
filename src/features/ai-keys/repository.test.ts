import { describe, expect, test, vi } from "vitest";

vi.mock("#/db", () => ({ db: {} }));

import {
	AiKeyEncryptionNotConfiguredError,
	createDrizzleAiKeyRepository,
} from "./repository";

describe("createDrizzleAiKeyRepository", () => {
	test("requires encryption before creating a key", async () => {
		const repository = createDrizzleAiKeyRepository({} as never, undefined);

		await expect(
			repository.create({
				label: "Primary",
				apiKey: "secret",
				actorId: "admin",
			}),
		).rejects.toBeInstanceOf(AiKeyEncryptionNotConfiguredError);
	});

	test("lists only the explicit public projection", async () => {
		const rows = [
			{
				id: "A",
				provider: "google",
				label: "Primary",
				maskedSuffix: "••••cret",
				enabled: true,
				validationStatus: "valid",
				cooldownUntil: null,
				lastCheckedAt: null,
				lastUsedAt: null,
				lastFailureAt: null,
				failureCode: null,
				failureMessage: null,
			},
		];
		const orderBy = vi.fn().mockResolvedValue(rows);
		const from = vi.fn(() => ({ orderBy }));
		let projection: Record<string, unknown> = {};
		const select = vi.fn((value: Record<string, unknown>) => {
			projection = value;
			return { from };
		});
		const repository = createDrizzleAiKeyRepository(
			{ select } as never,
			undefined,
		);

		const result = await repository.list();

		expect(result).toEqual([{ ...rows[0], lastSuccessAt: null }]);
		expect(Object.keys(projection)).not.toContain("encryptedSecret");
		expect(Object.keys(projection)).not.toContain("fingerprint");
	});
});
