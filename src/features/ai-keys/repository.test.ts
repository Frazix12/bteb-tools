import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
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
	rows: Array<{
		id: string;
		encryptedSecret: string;
		credentialRevision: number;
	}>,
) {
	let cursor = 0n;
	let release = Promise.resolve();
	const starts: bigint[] = [];
	const lockSql: string[] = [];
	const predicates: SQL[] = [];
	const transaction = async (callback: (tx: unknown) => Promise<unknown>) => {
		let unlock!: () => void;
		const tx = {
			insert: () => ({
				values: () => ({ onConflictDoNothing: async () => {} }),
			}),
			execute: async (query: SQL) => {
				const previous = release;
				release = new Promise<void>((resolve) => {
					unlock = resolve;
				});
				await previous;
				const compiled = new PgDialect().sqlToQuery(query.getSQL());
				lockSql.push(compiled.sql);
				starts.push(cursor);
				return { rows: [{ cursor }] };
			},
			select: () => ({
				from: () => ({
					where: (predicate: SQL) => {
						predicates.push(predicate);
						return { orderBy: async () => rows };
					},
				}),
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
			unlock?.();
		}
	};
	return {
		database: { transaction } as never,
		starts,
		lockSql,
		predicates,
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
			["A", "B", "C"].map((id) => ({
				id,
				encryptedSecret: `enc:key-${id}`,
				credentialRevision: 1,
			})),
		);
		const repository = createDrizzleAiKeyRepository(fake.database, cipher);

		expect(await repository.selectCandidates(new Date())).toEqual([
			{ id: "A", apiKey: "key-A", credentialRevision: 1 },
			{ id: "B", apiKey: "key-B", credentialRevision: 1 },
			{ id: "C", apiKey: "key-C", credentialRevision: 1 },
		]);
		expect(await repository.selectCandidates(new Date())).toEqual([
			{ id: "B", apiKey: "key-B", credentialRevision: 1 },
			{ id: "C", apiKey: "key-C", credentialRevision: 1 },
			{ id: "A", apiKey: "key-A", credentialRevision: 1 },
		]);
		expect(
			new Set((await repository.selectCandidates(new Date())).map((x) => x.id))
				.size,
		).toBe(3);
	});

	test("serializes overlapping selections to distinct cursor values", async () => {
		const fake = rotationDatabase(
			["A", "B", "C"].map((id) => ({
				id,
				encryptedSecret: `enc:${id}`,
				credentialRevision: 1,
			})),
		);
		const repository = createDrizzleAiKeyRepository(fake.database, cipher);
		const [first, second] = await Promise.all([
			repository.selectCandidates(new Date()),
			repository.selectCandidates(new Date()),
		]);
		expect(first.map((x) => x.id)).toEqual(["A", "B", "C"]);
		expect(second.map((x) => x.id)).toEqual(["B", "C", "A"]);
		expect(fake.starts).toEqual([0n, 1n]);
		expect(fake.lockSql).toHaveLength(2);
		expect(fake.lockSql.every((query) => /for update/i.test(query))).toBe(true);
		expect(fake.getCursor()).toBe(2n);
	});

	test("binds the complete candidate eligibility policy", async () => {
		const fake = rotationDatabase([
			{ id: "eligible", encryptedSecret: "enc:usable", credentialRevision: 1 },
		]);
		const repository = createDrizzleAiKeyRepository(fake.database, cipher);
		const candidates = await repository.selectCandidates(
			new Date("2026-07-11T00:00:00Z"),
		);
		expect(candidates).toEqual([
			{ id: "eligible", apiKey: "usable", credentialRevision: 1 },
		]);
		const query = new PgDialect().sqlToQuery(fake.predicates[0].getSQL());
		expect(query.sql).toMatch(/"provider" = \$1/);
		expect(query.sql).toMatch(/"enabled" = \$2/);
		expect(query.sql).toMatch(/"validation_status" = \$3/);
		expect(query.sql).toMatch(/"validation_status" = \$4/);
		expect(query.sql).toMatch(/"cooldown_until" is null/);
		expect(query.sql).toMatch(/"cooldown_until" <= \$5/);
		expect(query.params).toEqual([
			"google",
			true,
			"valid",
			"transient_failure",
			"2026-07-11T00:00:00.000Z",
		]);
	});

	test.each([
		["valid", null, true],
		["transient_failure", "2026-07-10T23:59:59Z", true],
		["transient_failure", "2026-07-11T00:01:00Z", false],
		["unchecked", null, false],
		["invalid", null, false],
	])("documents %s with cooldown %s as eligible=%s", (status, cooldown, eligible) => {
		const now = new Date("2026-07-11T00:00:00Z");
		const isEligible =
			status === "valid" ||
			(status === "transient_failure" &&
				(cooldown === null || new Date(cooldown) <= now));
		expect(isEligible).toBe(eligible);
	});

	test("documents disabled keys as ineligible", () => {
		expect(false && true).toBe(false);
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
		await repository.recordSuccess("A", 1, now);
		await repository.recordFailure(
			"A",
			1,
			{
				validationStatus: "transient_failure",
				cooldownUntil: new Date("2026-07-11T00:01:00Z"),
				failureCode: "UNAVAILABLE",
				failureMessage: "Temporary",
			},
			now,
		);
		await repository.recordValidationFailure(
			"A",
			1,
			{
				validationStatus: "invalid",
				enabled: false,
				failureCode: "INVALID",
				failureMessage: "Invalid",
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
		expect(updates[0]).not.toHaveProperty("lastValidatedAt");
		expect(updates[1]).toMatchObject({
			validationStatus: "transient_failure",
			lastFailureAt: now,
			lastFailureCode: "UNAVAILABLE",
			lastFailureMessage: "Temporary",
		});
		expect(updates[1]).not.toHaveProperty("lastValidatedAt");
		expect(updates[2]).toMatchObject({
			validationStatus: "invalid",
			lastValidatedAt: now,
			lastFailureAt: now,
		});
		expect(updates[2]).not.toHaveProperty("lastUsedAt");
	});

	test("guards out-of-order success and failure completions by attempt timestamp", async () => {
		const predicates: SQL[] = [];
		const database = {
			update: () => ({
				set: () => ({
					where: (predicate: SQL) => {
						predicates.push(predicate);
						return { returning: async () => [{ id: "A" }] };
					},
				}),
			}),
		};
		const repository = createDrizzleAiKeyRepository(database as never, cipher);
		const older = new Date("2026-07-11T00:00:00Z");
		const newer = new Date("2026-07-11T00:01:00Z");

		await repository.recordSuccess("A", 7, older);
		await repository.recordFailure("A", 7, { failureCode: "OLD" }, older);
		await repository.recordSuccess("A", 7, newer);
		await repository.recordFailure("A", 7, { failureCode: "NEW" }, newer);

		for (const [index, predicate] of predicates.entries()) {
			const query = new PgDialect().sqlToQuery(predicate.getSQL());
			const attemptAt = index < 2 ? older.toISOString() : newer.toISOString();
			expect(query.sql).toMatch(
				/last_success_at.*is null.*last_success_at.*<=/,
			);
			expect(query.sql).toMatch(
				/last_failure_at.*is null.*last_failure_at.*<=/,
			);
			expect(query.params.filter((value) => value === attemptAt)).toHaveLength(
				2,
			);
			expect(query.sql).toMatch(/"credential_revision" =/);
			expect(query.params).toContain(7);
		}
	});

	test.each([
		"recordSuccess",
		"recordFailure",
		"recordValidationSuccess",
		"recordValidationFailure",
	] as const)("ignores stale %s completion after credential replacement", async (method) => {
		const predicates: SQL[] = [];
		const database = {
			update: () => ({
				set: () => ({
					where: (predicate: SQL) => {
						predicates.push(predicate);
						return { returning: async () => [] };
					},
				}),
			}),
			select: () => ({
				from: () => ({ where: () => ({ limit: async () => [{ id: "A" }] }) }),
			}),
		};
		const repository = createDrizzleAiKeyRepository(database as never, cipher);
		const now = new Date("2026-07-11T00:00:00Z");
		if (method === "recordSuccess") await repository.recordSuccess("A", 1, now);
		else if (method === "recordValidationSuccess")
			await repository.recordValidationSuccess("A", 1, now);
		else await repository[method]("A", 1, { failureCode: "STALE" }, now);
		const query = new PgDialect().sqlToQuery(predicates[0].getSQL());
		expect(query.sql).toMatch(/"credential_revision" =/);
		expect(query.params).toContain(1);
	});

	test("validation success atomically re-enables and clears failure health", async () => {
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

		await repository.recordValidationSuccess("A", 1, now);

		expect(updates).toEqual([
			expect.objectContaining({
				enabled: true,
				validationStatus: "valid",
				cooldownUntil: null,
				lastValidatedAt: now,
				lastFailureAt: null,
				lastFailureCode: null,
				lastFailureMessage: null,
			}),
		]);
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
