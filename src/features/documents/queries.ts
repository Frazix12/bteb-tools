import type { QueryClient } from "@tanstack/react-query";

import { orpc } from "#/orpc/client";

import { createDocumentCacheActions } from "./query-cache";
import type { DocumentType } from "./types";

export const documentListOptions = () =>
	orpc.documents.list.queryOptions({ input: {} });
export const documentOptions = (id: string, type: DocumentType) =>
	orpc.documents.get.queryOptions({ input: { id, type } });

function cacheActions(queryClient: QueryClient) {
	return createDocumentCacheActions(queryClient, {
		list: orpc.documents.list.key(),
		detail: (id, type) => orpc.documents.get.queryKey({ input: { id, type } }),
	});
}

export const createDocumentMutationOptions = (queryClient: QueryClient) =>
	orpc.documents.create.mutationOptions({
		onSuccess: (document) => cacheActions(queryClient).saved(document),
	});
export const updateDocumentMutationOptions = (queryClient: QueryClient) =>
	orpc.documents.update.mutationOptions({
		onSuccess: (document) => cacheActions(queryClient).saved(document),
	});
export const duplicateDocumentMutationOptions = (queryClient: QueryClient) =>
	orpc.documents.duplicate.mutationOptions({
		onSuccess: () => cacheActions(queryClient).listChanged(),
	});
export const removeDocumentMutationOptions = (
	queryClient: QueryClient,
	type: DocumentType,
) =>
	orpc.documents.remove.mutationOptions({
		onSuccess: (_document, input) =>
			cacheActions(queryClient).removed(input.id, type),
	});
