import { readFile } from "node:fs/promises";

import { describe, expect, test } from "vitest";

import { parseLegacyDocument, serializeLegacyDocument } from "./legacy-json";

const fixture = (name: string) =>
	readFile(
		new URL(`../../../tests/fixtures/legacy/${name}`, import.meta.url),
		"utf8",
	);

describe("legacy document JSON", () => {
	test("round-trips an index sheet without losing legacy fields", async () => {
		const source = await fixture("index-sheet.json");
		const parsed = parseLegacyDocument(source, "index_sheet");

		expect(parsed.ok).toBe(true);
		if (!parsed.ok) return;
		expect(parsed.data.entries[0]?.name).toContain("ফটোসিন্থেসিসের");
		const exported = JSON.parse(
			serializeLegacyDocument(parsed.data, "2026-07-10T09:00:00.000Z"),
		);
		expect(exported).toMatchObject({
			schemaVersion: 1,
			exportedAt: "2026-07-10T09:00:00.000Z",
			rowsPerPage: 10,
			showPageNo: true,
		});
		expect(exported.entries).toEqual(parsed.data.entries);
	});

	test("round-trips a cover page including its logo and nested fields", async () => {
		const source = await fixture("cover-page.json");
		const parsed = parseLegacyDocument(source, "cover_page");

		expect(parsed.ok).toBe(true);
		if (!parsed.ok) return;
		const exported = JSON.parse(serializeLegacyDocument(parsed.data));
		expect(exported.logoDataUrl).toBe("data:image/png;base64,aGVsbG8=");
		expect(exported.submittedBy.subjectCode).toBe("25931");
		expect(exported.submittedTo.designation).toBe("Lecturer");
	});

	test("normalizes optional values omitted by permissive legacy files", () => {
		const parsed = parseLegacyDocument(
			JSON.stringify({ entries: [{ name: "Experiment" }] }),
			"index_sheet",
		);

		expect(parsed).toMatchObject({
			ok: true,
			data: {
				title: "INDEX",
				showPageNo: false,
				entries: [
					{ name: "Experiment", issueDate: "", submitDate: "", pageNo: "" },
				],
			},
		});
	});

	test("rejects malformed JSON and the wrong document type safely", async () => {
		expect(parseLegacyDocument("not json", "index_sheet")).toEqual({
			ok: false,
			message: "Could not read that file as JSON.",
		});
		expect(
			parseLegacyDocument(await fixture("cover-page.json"), "index_sheet"),
		).toEqual({
			ok: false,
			message: "This file is not a valid index sheet export.",
		});
	});
});
