import { QueryClient } from "@tanstack/react-query";
import { describe, expect, test, vi } from "vitest";

import { createDocumentCacheActions } from "./query-cache";

describe("document cache actions", () => {
	test("refreshes the list and caches a saved document", async () => {
		const queryClient = new QueryClient();
		const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
		const setQueryData = vi.spyOn(queryClient, "setQueryData");
		const cache = createDocumentCacheActions(queryClient, {
			list: ["documents", "list"],
			detail: (id, type) => ["documents", type, id],
		});
		const document = { id: "doc-1", type: "index_sheet" as const };

		await cache.saved(document);

		expect(invalidateQueries).toHaveBeenCalledWith({
			queryKey: ["documents", "list"],
		});
		expect(setQueryData).toHaveBeenCalledWith(
			["documents", "index_sheet", "doc-1"],
			document,
		);
	});

	test("removes deleted detail data and refreshes the list", async () => {
		const queryClient = new QueryClient();
		const removeQueries = vi.spyOn(queryClient, "removeQueries");
		const cache = createDocumentCacheActions(queryClient, {
			list: ["documents", "list"],
			detail: (id, type) => ["documents", type, id],
		});

		await cache.removed("doc-1", "cover_page");

		expect(removeQueries).toHaveBeenCalledWith({
			queryKey: ["documents", "cover_page", "doc-1"],
		});
	});
});
