import { describe, expect, test, vi } from "vitest";

import { classifyGeminiError } from "./gemini-errors";
import { createGeminiCredentialValidator } from "./gemini-validation";
import { createGeminiKeyPool } from "./key-pool";

describe("createGeminiCredentialValidator", () => {
	test("passes the supplied credential and configured model to Gemini", async () => {
		const adapter = {};
		const createAdapter = vi.fn(() => adapter);
		const runChat = vi.fn(async () => ({}));
		const validate = createGeminiCredentialValidator({
			model: "gemini-test",
			createAdapter,
			runChat,
		});

		await validate("supplied-secret");

		expect(createAdapter).toHaveBeenCalledWith(
			"gemini-test",
			"supplied-secret",
		);
		expect(runChat).toHaveBeenCalledWith(adapter);
	});

	test("preserves raw provider failures for pool classification", async () => {
		const providerError = { status: 401, code: "API_KEY_INVALID" };
		const validate = createGeminiCredentialValidator({
			model: "gemini-test",
			createAdapter: vi.fn(() => ({})),
			runChat: vi.fn(async () => {
				throw providerError;
			}),
		});

		await expect(validate("bad-secret")).rejects.toBe(providerError);
	});

	test("production boundary failure is classified and never marks the key valid", async () => {
		const recordFailure = vi.fn(async () => undefined);
		const recordValidationFailure = vi.fn(async () => undefined);
		const recordValidationSuccess = vi.fn(async () => undefined);
		const repo = {
			getForValidation: vi.fn(async () => ({
				id: "key-id",
				apiKey: "bad-secret",
			})),
			recordFailure,
			recordValidationFailure,
			recordValidationSuccess,
			list: vi.fn(async () => [{ id: "key-id", validationStatus: "invalid" }]),
		};
		const validateCredential = createGeminiCredentialValidator({
			model: "gemini-test",
			createAdapter: vi.fn((_model, apiKey) => ({ apiKey })),
			runChat: vi.fn(async () => {
				throw { status: 401, code: "API_KEY_INVALID" };
			}),
		});
		const pool = createGeminiKeyPool({
			repo: repo as never,
			getFallbackKey: () => undefined,
			now: () => new Date("2026-07-12T00:00:00.000Z"),
			classifier: classifyGeminiError,
			validateCredential,
			getPublicKey: async () =>
				({ id: "key-id", validationStatus: "invalid" }) as never,
		});

		await pool.validateOne("key-id");

		expect(repo.getForValidation).toHaveBeenCalledWith("key-id");
		expect(recordValidationSuccess).not.toHaveBeenCalled();
		expect(recordValidationFailure).toHaveBeenCalledWith(
			"key-id",
			expect.objectContaining({ validationStatus: "invalid", enabled: false }),
			new Date("2026-07-12T00:00:00.000Z"),
		);
		expect(recordFailure).not.toHaveBeenCalled();
	});
});
