import { describe, expect, test, vi } from "vitest";

import {
	createAutofillExtractor,
	NoMeaningfulAutofillFieldsError,
	ProviderAutofillError,
} from "./extract";

describe("autofill extraction", () => {
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
