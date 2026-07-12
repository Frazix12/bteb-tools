import { describe, expect, test, vi } from "vitest";
import { createGeminiKeyPool, GeminiKeyUnavailableError } from "./key-pool";
import type { AiKeyRepository, PublicAiKey } from "./types";

const now = new Date("2026-07-12T00:00:00.000Z");
const publicKey = (id: string): PublicAiKey => ({
	id,
	provider: "google",
	label: id,
	maskedSuffix: "••••test",
	enabled: true,
	validationStatus: "unchecked",
	cooldownUntil: null,
	lastCheckedAt: null,
	lastUsedAt: null,
	lastSuccessAt: null,
	lastFailureAt: null,
	failureCode: null,
	failureMessage: null,
});

function required<T>(value: T | undefined): T {
	if (value === undefined) throw new Error("Missing test fixture");
	return value;
}

function setup(
	candidates = [
		{ id: "A", apiKey: "key-A" },
		{ id: "B", apiKey: "key-B" },
	],
	fallback?: string,
) {
	const keys = new Map(candidates.map(({ id }) => [id, publicKey(id)]));
	const repo = {
		selectCandidates: vi.fn(async () => candidates),
		recordSuccess: vi.fn(async () => {}),
		recordValidationSuccess: vi.fn(async () => {}),
		recordValidationFailure: vi.fn(async () => {}),
		recordFailure: vi.fn(async () => {}),
		getForValidation: vi.fn(async (id: string) =>
			required(candidates.find((candidate) => candidate.id === id)),
		),
		list: vi.fn(async () => [...keys.values()]),
	} as unknown as AiKeyRepository;
	const classifier = (error: unknown) => {
		const kind = (
			error as { kind: "invalid" | "quota" | "transient" | "request" }
		).kind;
		return {
			kind,
			code: kind,
			message: `${kind} failure`,
			retryable: kind !== "request",
			cooldownUntil:
				kind === "quota"
					? new Date(now.getTime() + 60_000)
					: kind === "transient"
						? new Date(now.getTime() + 15_000)
						: null,
		};
	};
	const pool = createGeminiKeyPool({
		repo,
		getFallbackKey: () => fallback,
		now: () => now,
		classifier,
		validateCredential: vi.fn(async () => {}),
		getPublicKey: async (id: string) => required(keys.get(id)),
	});
	return { pool, repo, keys };
}

describe("Gemini key pool", () => {
	test("fails over from quota A to successful B", async () => {
		const { pool, repo } = setup();
		const execute = vi.fn(async (key: string) => {
			if (key === "key-A") throw { kind: "quota" };
			return "ok";
		});
		await expect(pool.run(execute)).resolves.toBe("ok");
		expect(execute).toHaveBeenCalledTimes(2);
		expect(repo.recordFailure).toHaveBeenCalledWith(
			"A",
			expect.objectContaining({ kind: "quota" }),
			expect.any(Date),
		);
		expect(repo.recordSuccess).toHaveBeenCalledWith("B", expect.any(Date));
	});

	test.each([
		["invalid", { enabled: false }],
		["transient", { cooldownUntil: new Date(now.getTime() + 15_000) }],
	] as const)("updates %s failures before failover", async (kind, expected) => {
		const { pool, repo } = setup();
		await pool.run(async (key) => {
			if (key === "key-A") throw { kind };
			return "ok";
		});
		expect(repo.recordFailure).toHaveBeenCalledWith(
			"A",
			expect.objectContaining(expected),
			now,
		);
	});

	test("stops immediately on request failures", async () => {
		const { pool, repo } = setup(undefined, "fallback");
		const execute = vi.fn(async () => {
			throw { kind: "request" };
		});
		await expect(pool.run(execute)).rejects.toEqual({ kind: "request" });
		expect(execute).toHaveBeenCalledTimes(1);
		expect(repo.recordFailure).not.toHaveBeenCalled();
		expect(repo.recordSuccess).not.toHaveBeenCalled();
	});

	test("attempts duplicate candidate ids once and fallback once", async () => {
		const { pool } = setup(
			[
				{ id: "A", apiKey: "key-A" },
				{ id: "A", apiKey: "key-A" },
			],
			"fallback",
		);
		const execute = vi.fn(async (key: string) => {
			if (key !== "fallback") throw { kind: "quota" };
			return "ok";
		});
		await expect(pool.run(execute)).resolves.toBe("ok");
		expect(execute.mock.calls.map(([key]) => key)).toEqual([
			"key-A",
			"fallback",
		]);
	});

	test("throws a typed unavailable error when no key exists", async () => {
		const { pool } = setup([]);
		await expect(pool.run(vi.fn())).rejects.toBeInstanceOf(
			GeminiKeyUnavailableError,
		);
	});

	test.each([
		[undefined, "valid", true],
		["invalid", "invalid", false],
	] as const)("validates stored secret without returning it", async (failure, status, enabled) => {
		const { repo, keys } = setup([{ id: "A", apiKey: "stored-secret" }]);
		const validateCredential = vi.fn(async (key: string) => {
			expect(key).toBe("stored-secret");
			if (failure) throw { kind: failure };
		});
		const pool = createGeminiKeyPool({
			repo,
			getFallbackKey: () => undefined,
			now: () => now,
			classifier: (error) => ({
				kind: (error as { kind: "invalid" }).kind,
				code: "invalid",
				message: "Invalid Gemini credential",
				retryable: true,
				cooldownUntil: null,
			}),
			validateCredential,
			getPublicKey: async (id) => ({
				...required(keys.get(id)),
				validationStatus: status,
				enabled,
			}),
		});
		const result = await pool.validateOne("A");
		expect(JSON.stringify(result)).not.toContain("stored-secret");
		if (failure)
			expect(repo.recordValidationFailure).toHaveBeenCalledWith(
				"A",
				expect.objectContaining({
					enabled: false,
					validationStatus: "invalid",
				}),
				now,
			);
		else expect(repo.recordValidationSuccess).toHaveBeenCalledWith("A", now);
	});

	test("validateAll limits validation concurrency to three", async () => {
		const candidates = Array.from({ length: 8 }, (_, index) => ({
			id: `${index}`,
			apiKey: `key-${index}`,
		}));
		const { repo, keys } = setup(candidates);
		let active = 0;
		let peak = 0;
		const validateCredential = vi.fn(async () => {
			active++;
			peak = Math.max(peak, active);
			await new Promise((resolve) => setTimeout(resolve, 5));
			active--;
		});
		const pool = createGeminiKeyPool({
			repo,
			getFallbackKey: () => undefined,
			now: () => now,
			classifier: vi.fn(),
			validateCredential,
			getPublicKey: async (id) => required(keys.get(id)),
		});
		const results = await pool.validateAll();
		expect(
			results.map(({ id, validationStatus }) => ({ id, validationStatus })),
		).toEqual(
			candidates.map(({ id }) => ({ id, validationStatus: "unchecked" })),
		);
		expect(repo.getForValidation).toHaveBeenCalledTimes(8);
		expect(repo.recordValidationSuccess).toHaveBeenCalledTimes(8);
		expect(peak).toBeLessThanOrEqual(3);
	});
});
