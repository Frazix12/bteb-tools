import { describe, expect, test } from "vitest";

import { paginateIndexEntries } from "./paginate";

const entry = (name: string) => ({
	name,
	issueDate: "",
	submitDate: "",
	pageNo: "",
});

describe("paginateIndexEntries", () => {
	test.each([
		[0, 1],
		[1, 1],
		[10, 1],
		[11, 2],
		[20, 2],
	])("renders %i entries across %i full pages", (count, pageCount) => {
		const pages = paginateIndexEntries(
			Array.from({ length: count }, (_, index) => entry(`Row ${index + 1}`)),
		);

		expect(pages).toHaveLength(pageCount);
		expect(pages.every((page) => page.length === 10)).toBe(true);
	});

	test("keeps numbering and zebra parity global across page boundaries", () => {
		const pages = paginateIndexEntries(
			Array.from({ length: 11 }, (_, index) => entry(`Row ${index + 1}`)),
		);

		expect(pages[0]?.[0]).toMatchObject({ sequence: "01", zebra: false });
		expect(pages[0]?.[9]).toMatchObject({ sequence: "10", zebra: true });
		expect(pages[1]?.[0]).toMatchObject({ sequence: "11", zebra: false });
		expect(pages[1]?.[9]).toMatchObject({
			sequence: "20",
			zebra: true,
			entry: null,
		});
	});
});
