import type { IndexSheetData } from "#/orpc/schemas/document";

type IndexEntry = IndexSheetData["entries"][number];

export type IndexPageRow = {
	entry: IndexEntry | null;
	sequence: string;
	zebra: boolean;
};

const ROWS_PER_PAGE = 10;

export function paginateIndexEntries(entries: IndexEntry[]) {
	const totalRows = Math.max(entries.length, ROWS_PER_PAGE);
	const pageCount = Math.ceil(totalRows / ROWS_PER_PAGE);

	return Array.from({ length: pageCount }, (_, pageIndex) =>
		Array.from({ length: ROWS_PER_PAGE }, (_, rowIndex): IndexPageRow => {
			const index = pageIndex * ROWS_PER_PAGE + rowIndex;
			return {
				entry: entries[index] ?? null,
				sequence: String(index + 1).padStart(2, "0"),
				zebra: index % 2 === 1,
			};
		}),
	);
}
