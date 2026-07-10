import type { IndexSheetData } from "#/orpc/schemas/document";

export function createBlankIndexSheet(): IndexSheetData {
	return {
		schemaVersion: 1,
		exportedAt: new Date().toISOString(),
		title: "INDEX",
		rowsPerPage: 10,
		showPageNo: false,
		entries: [],
	};
}
