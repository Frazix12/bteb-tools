import type { QueryClient, QueryKey } from "@tanstack/react-query";

import type { DocumentType } from "./types";

type CacheKeys = {
	list: QueryKey;
	detail: (id: string, type: DocumentType) => QueryKey;
};

export function createDocumentCacheActions(
	queryClient: QueryClient,
	keys: CacheKeys,
) {
	return {
		async saved(document: { id: string; type: DocumentType }) {
			queryClient.setQueryData(
				keys.detail(document.id, document.type),
				document,
			);
			await queryClient.invalidateQueries({ queryKey: keys.list });
		},
		async removed(id: string, type: DocumentType) {
			queryClient.removeQueries({ queryKey: keys.detail(id, type) });
			await queryClient.invalidateQueries({ queryKey: keys.list });
		},
		async listChanged() {
			await queryClient.invalidateQueries({ queryKey: keys.list });
		},
	};
}
