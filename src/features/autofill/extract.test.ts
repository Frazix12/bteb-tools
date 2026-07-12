import { describe, expect, test, vi } from "vitest";
import { z } from "zod";

import { classifyGeminiError } from "#/features/ai-keys/gemini-errors";
import {
	CoverAutofillProviderSchema,
	captureGeminiGeneration,
	createAutofillExtractor,
	createGeminiAutofillGenerator,
	IndexAutofillProviderSchema,
	NoMeaningfulAutofillFieldsError,
	ProviderAutofillError,
} from "./extract";

const request = {
	type: "cover_page" as const,
	prompt: "private source",
	schema: CoverAutofillProviderSchema,
};

describe("autofill extraction", () => {
	test("fails over a quota-limited key and returns the successful key usage", async () => {
		const adapters: string[] = [];
		const pool = {
			run: async <T>(execute: (apiKey: string) => Promise<T>) => {
				try {
					await execute("quota-key");
				} catch (error) {
					expect(classifyGeminiError(error, new Date()).kind).toBe("quota");
				}
				return execute("working-key");
			},
		};
		const generate = createGeminiAutofillGenerator({
			pool,
			model: "gemini-test",
			createAdapter: (_model, apiKey) => {
				adapters.push(apiKey);
				return { apiKey };
			},
			runChat: async (adapter, _request, onUsage) => {
				if ((adapter as { apiKey: string }).apiKey === "quota-key")
					throw Object.assign(new Error("secret quota response"), {
						status: 429,
					});
				onUsage(17, 5);
				return { instituteName: "Institute", docType: "Assignment" };
			},
		});

		await expect(generate(request)).resolves.toMatchObject({
			value: { instituteName: "Institute", docType: "Assignment" },
			usage: { model: "gemini-test", inputTokens: 17, outputTokens: 5 },
		});
		expect(adapters).toEqual(["quota-key", "working-key"]);
	});

	test("attempts a schema failure once and sanitizes it", async () => {
		const execute = vi.fn(async (apiKey: string) => {
			throw Object.assign(new Error(`private schema response for ${apiKey}`), {
				code: "SCHEMA_ERROR",
			});
		});
		const pool = {
			run: <T>(operation: (apiKey: string) => Promise<T>) =>
				operation("only-key"),
		};
		const generate = createGeminiAutofillGenerator({
			pool,
			model: "gemini-test",
			createAdapter: (_model, apiKey) => apiKey,
			runChat: (adapter) => execute(adapter as string),
		});
		const extract = createAutofillExtractor(generate);

		await expect(
			extract("cover_page", "A sufficiently long input"),
		).rejects.toMatchObject({
			message: "AI extraction is temporarily unavailable.",
		});
		expect(execute).toHaveBeenCalledTimes(1);
	});
	test("preserves captured usage when Gemini rejects after reporting tokens", async () => {
		const run = vi.fn(async ({ middleware }) => {
			middleware[0].onUsage({}, { promptTokens: 123, completionTokens: 45 });
			throw new Error("private upstream response");
		});
		const generate = () =>
			captureGeminiGeneration("gemini-3.1-flash-lite", run);
		const extract = createAutofillExtractor(generate);

		await expect(
			extract("cover_page", "A sufficiently long private source"),
		).rejects.toMatchObject({
			usage: {
				provider: "google",
				model: "gemini-3.1-flash-lite",
				inputTokens: 123,
				outputTokens: 45,
			},
			message: "AI extraction is temporarily unavailable.",
		});
	});
	test("uses a Gemini-compatible JSON response schema", () => {
		const serialized = JSON.stringify(
			z.toJSONSchema(IndexAutofillProviderSchema),
		);
		for (const unsupported of ["const", "maxItems", "maxLength", "format"]) {
			expect(serialized).not.toContain(`"${unsupported}"`);
		}
	});
	test("returns only validated cover fields and counts nonempty leaves", async () => {
		const generate = vi.fn().mockResolvedValue({
			instituteName: "ঢাকা পলিটেকনিক ইনস্টিটিউট",
			docType: "Lab Report",
			submittedBy: { name: "রহিম", regNo: "" },
		});
		const extract = createAutofillExtractor(generate);

		await expect(
			extract("cover_page", "ঢাকা পলিটেকনিকের ল্যাব রিপোর্ট, শিক্ষার্থী রহিম"),
		).resolves.toEqual({
			type: "cover_page",
			patch: {
				instituteName: "ঢাকা পলিটেকনিক ইনস্টিটিউট",
				docType: "Lab Report",
				submittedBy: { name: "রহিম" },
			},
			extractedFieldCount: 3,
			warnings: [],
			usage: {
				provider: "google",
				model: "unknown",
				inputTokens: null,
				outputTokens: null,
			},
		});
		expect(generate).toHaveBeenCalledWith(
			expect.objectContaining({ type: "cover_page" }),
		);
	});

	test("accepts an index patch with one nonempty experiment", async () => {
		const extract = createAutofillExtractor(
			vi.fn().mockResolvedValue({
				entries: [{ name: "Ohm's law", issueDate: "2026-07-01" }],
			}),
		);

		await expect(
			extract("index_sheet", "Experiment: Ohm's law"),
		).resolves.toEqual(
			expect.objectContaining({
				type: "index_sheet",
				extractedFieldCount: 2,
			}),
		);
	});

	test("rejects invalid provider output and sanitizes provider failures", async () => {
		const invalid = createAutofillExtractor(
			vi.fn().mockResolvedValue({
				entries: [{ name: "Test", issueDate: "07/01/2026" }],
			}),
		);
		await expect(
			invalid("index_sheet", "A sufficiently long input"),
		).rejects.toBeInstanceOf(ProviderAutofillError);

		const invented = createAutofillExtractor(
			vi.fn().mockResolvedValue({
				instituteName: "Institute",
				docType: "Assignment",
				submittedBy: { name: "Student", inventedIdentity: "fake" },
			}),
		);
		await expect(
			invented("cover_page", "A sufficiently long input"),
		).rejects.toBeInstanceOf(ProviderAutofillError);

		const failed = createAutofillExtractor(
			vi.fn().mockRejectedValue(new Error("API key secret and upstream body")),
		);
		await expect(
			failed("cover_page", "A sufficiently long input"),
		).rejects.toMatchObject({
			message: "AI extraction is temporarily unavailable.",
		});
	});

	test("requires two cover leaves and one nonempty index experiment", async () => {
		const sparseCover = createAutofillExtractor(
			vi.fn().mockResolvedValue({ instituteName: "Only one" }),
		);
		await expect(
			sparseCover("cover_page", "A sufficiently long input"),
		).rejects.toBeInstanceOf(NoMeaningfulAutofillFieldsError);

		const emptyIndex = createAutofillExtractor(
			vi.fn().mockResolvedValue({ entries: [{ name: "", pageNo: "12" }] }),
		);
		await expect(
			emptyIndex("index_sheet", "A sufficiently long input"),
		).rejects.toBeInstanceOf(NoMeaningfulAutofillFieldsError);
	});
});
