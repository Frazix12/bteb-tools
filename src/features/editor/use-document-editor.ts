import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { inlineLogoStorage } from "#/features/cover-page/logo-storage";
import {
	createDocumentMutationOptions,
	documentOptions,
	updateDocumentMutationOptions,
} from "#/features/documents/queries";
import type { CoverPageData, IndexSheetData } from "#/orpc/schemas/document";

export function useIndexSheetDocument(id?: string) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const documentQuery = useQuery({
		...documentOptions(
			id ?? "00000000-0000-4000-8000-000000000000",
			"index_sheet",
		),
		enabled: Boolean(id),
		retry: false,
	});
	const create = useMutation(createDocumentMutationOptions(queryClient));
	const update = useMutation(updateDocumentMutationOptions(queryClient));
	const save = async (data: IndexSheetData) => {
		const normalizedData = { ...data, title: data.title.trim() || "INDEX" };
		const input = {
			type: "index_sheet" as const,
			title: normalizedData.title,
			data: normalizedData,
			logoDataUrl: null,
		};
		if (id) return update.mutateAsync({ ...input, id });
		const created = await create.mutateAsync(input);
		await navigate({
			to: "/index-sheet/$id",
			params: { id: created.id },
			replace: true,
		});
		return created;
	};
	return {
		documentQuery,
		isSaving: create.isPending || update.isPending,
		save,
	};
}

export function useCoverPageDocument(id?: string) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const documentQuery = useQuery({
		...documentOptions(
			id ?? "00000000-0000-4000-8000-000000000000",
			"cover_page",
		),
		enabled: Boolean(id),
		retry: false,
	});
	const create = useMutation(createDocumentMutationOptions(queryClient));
	const update = useMutation(updateDocumentMutationOptions(queryClient));
	const save = async (data: CoverPageData) => {
		const storedLogo = inlineLogoStorage.normalize(data.logoDataUrl);
		const normalizedData = inlineLogoStorage.toDocumentData(data, storedLogo);
		const input = {
			type: "cover_page" as const,
			title: data.docType.trim() || "Cover Page",
			data: normalizedData,
			logoDataUrl: storedLogo,
		};
		if (id) return update.mutateAsync({ ...input, id });
		const created = await create.mutateAsync(input);
		await navigate({
			to: "/cover-page/$id",
			params: { id: created.id },
			replace: true,
		});
		return created;
	};
	return {
		documentQuery,
		isSaving: create.isPending || update.isPending,
		save,
	};
}
