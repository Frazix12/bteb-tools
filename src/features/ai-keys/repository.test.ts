import { describe, expect, test, vi } from "vitest";

vi.mock("#/db", () => ({ db: {} }));
vi.mock("#/env", () => ({ env: {} }));

import {
	AiKeyEncryptionNotConfiguredError,
	createDrizzleAiKeyRepository,
	DuplicateAiKeyError,
} from "./repository";

const cipher = {
	encrypt: (value: string) => `enc:${value}`,
	decrypt: (value: string) => value.replace("enc:", ""),
	fingerprint: (value: string) => `fp:${value}`,
	mask: (value: string) => `••••${value.slice(-4)}`,
};

function rotationDatabase(
	rows: Array<{ id: string; encryptedSecret: string }>,
) {
	let cursor = 0n;
	let release = Promise.resolve();
	const starts: bigint[] = [];
	const transaction = async (callback: (tx: unknown) => Promise<unknown>) => {
		const previous = release;
		let unlock!: () => void;
		release = new Promise<void>((resolve) => {
			unlock = resolve;
		});
		await previous;
		starts.push(cursor);
		const tx = {
			insert: () => ({
				values: () => ({ onConflictDoNothing: async () => {} }),
			}),
			execute: async () => ({ rows: [{ cursor }] }),
			select: () => ({
				from: () => ({ where: () => ({ orderBy: async () => rows }) }),
			}),
			update: () => ({
				set: (value: { cursor: bigint }) => ({
					where: async () => {
						cursor = value.cursor;
					},
				}),
			}),
		};
		try {
			return await callback(tx);
		} finally {
			unlock();
		}
	};
	return {
		database: { transaction } as never,
		starts,
		getCursor: () => cursor,
	};
}

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

	test("translates fingerprint unique violations", async () => {
		const database = {
			insert: () => ({
				values: () => ({
					returning: async () => {
						throw { code: "23505" };
					},
				}),
			}),
		};
		const repository = createDrizzleAiKeyRepository(database as never, cipher);
		await expect(
			repository.create({
				label: "Duplicate",
				apiKey: "same",
				actorId: "admin",
			}),
		).rejects.toBeInstanceOf(DuplicateAiKeyError);
	});

	test("rotates candidates and decrypts only the server candidate shape", async () => {
		const fake = rotationDatabase(
			["A", "B", "C"].map((id) => ({ id, encryptedSecret: `enc:key-${id}` })),
		);
		const repository = createDrizzleAiKeyRepository(fake.database, cipher);

		expect(await repository.selectCandidates(new Date())).toEqual([
			{ id: "A", apiKey: "key-A" },
			{ id: "B", apiKey: "key-B" },
			{ id: "C", apiKey: "key-C" },
		]);
		expect(await repository.selectCandidates(new Date())).toEqual([
			{ id: "B", apiKey: "key-B" },
			{ id: "C", apiKey: "key-C" },
			{ id: "A", apiKey: "key-A" },
		]);
		expect(
			new Set((await repository.selectCandidates(new Date())).map((x) => x.id))
				.size,
		).toBe(3);
	});

	test("serializes overlapping selections to distinct cursor values", async () => {
		const fake = rotationDatabase(
			["A", "B", "C"].map((id) => ({ id, encryptedSecret: `enc:${id}` })),
		);
		const repository = createDrizzleAiKeyRepository(fake.database, cipher);
		const [first, second] = await Promise.all([
			repository.selectCandidates(new Date()),
			repository.selectCandidates(new Date()),
		]);
		expect(first.map((x) => x.id)).toEqual(["A", "B", "C"]);
		expect(second.map((x) => x.id)).toEqual(["B", "C", "A"]);
		expect(fake.starts).toEqual([0n, 1n]);
		expect(fake.getCursor()).toBe(2n);
	});

	test("returns only the adapter-filtered eligible keys", async () => {
		// The fake models PostgreSQL applying the repository WHERE clause: disabled,
		// invalid, and future-cooldown rows are absent from the selected result.
		const fake = rotationDatabase([
			{ id: "eligible", encryptedSecret: "enc:usable" },
		]);
		const repository = createDrizzleAiKeyRepository(fake.database, cipher);
		const candidates = await repository.selectCandidates(
			new Date("2026-07-11T00:00:00Z"),
		);
		expect(candidates).toEqual([{ id: "eligible", apiKey: "usable" }]);
		expect(candidates.map((item) => item.id)).not.toEqual(
			expect.arrayContaining(["disabled", "invalid", "cooling-down"]),
		);
	});

	test("persists success and failure health timestamps", async () => {
		const updates: Record<string, unknown>[] = [];
		const database = {
			update: () => ({
				set: (value: Record<string, unknown>) => {
					updates.push(value);
					return { where: () => ({ returning: async () => [{ id: "A" }] }) };
				},
			}),
		};
		const repository = createDrizzleAiKeyRepository(database as never, cipher);
		const now = new Date("2026-07-11T00:00:00Z");
		await repository.recordSuccess("A", now);
		await repository.recordFailure(
			"A",
			{
				validationStatus: "transient_failure",
				cooldownUntil: new Date("2026-07-11T00:01:00Z"),
				failureCode: "UNAVAILABLE",
				failureMessage: "Temporary",
			},
			now,
		);
		expect(updates[0]).toMatchObject({
			validationStatus: "valid",
			lastSuccessAt: now,
			lastUsedAt: now,
			cooldownUntil: null,
			lastFailureCode: null,
			lastFailureMessage: null,
		});
		expect(updates[1]).toMatchObject({
			validationStatus: "transient_failure",
			lastFailureAt: now,
			lastFailureCode: "UNAVAILABLE",
			lastFailureMessage: "Temporary",
		});
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

		expect(result).toEqual(rows);
		expect(Object.keys(projection)).not.toContain("encryptedSecret");
		expect(Object.keys(projection)).not.toContain("fingerprint");
	});
});
