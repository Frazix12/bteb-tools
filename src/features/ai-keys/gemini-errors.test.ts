import { describe, expect, test } from "vitest";
import { classifyGeminiError } from "./gemini-errors";

const now = new Date("2026-07-12T00:00:00.000Z");

describe("classifyGeminiError", () => {
	test.each([
		401, 403,
	])("classifies %i authentication errors as invalid", (status) => {
		expect(
			classifyGeminiError({ status, message: "authentication failed" }, now),
		).toMatchObject({
			kind: "invalid",
			retryable: true,
		});
	});

	test("classifies quota errors and honors retry metadata", () => {
		expect(
			classifyGeminiError(
				{ status: 429, code: "RESOURCE_EXHAUSTED", retryAfter: "120" },
				now,
			),
		).toMatchObject({
			kind: "quota",
			cooldownUntil: new Date(now.getTime() + 120_000),
		});
	});

	test.each([
		{ status: 503 },
		{ code: "ECONNRESET" },
	])("classifies network and server failures as transient", (error) =>
		expect(classifyGeminiError(error, now).kind).toBe("transient"));

	test.each([
		{ status: 400 },
		{ code: "SAFETY" },
		{ code: "INVALID_ARGUMENT", message: "schema invalid" },
		{ message: "structured output could not be parsed" },
	])("classifies caller-correctable failures as request", (error) => {
		expect(classifyGeminiError(error, now)).toMatchObject({
			kind: "request",
			retryable: false,
			cooldownUntil: null,
		});
	});

	test("never persists response text that can contain an API key", () => {
		const secret = "AIza-secret-key";
		const failure = classifyGeminiError(
			{ status: 500, message: `upstream echoed ${secret}` },
			now,
		);
		expect(failure.message).not.toContain(secret);
		expect(failure.message).toBe("Gemini service temporarily unavailable");
	});
});
