import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { createBlankCoverPage } from "#/features/cover-page/defaults";
import { inlineLogoStorage } from "#/features/cover-page/logo-storage";
import {
	createDocumentMutationOptions,
	documentOptions,
	updateDocumentMutationOptions,
} from "#/features/documents/queries";
import { createBlankIndexSheet } from "#/features/index-sheet/defaults";
import type { CoverPageData, IndexSheetData } from "#/orpc/schemas/document";

const isoDate = z.iso.date();
const isoDateTime = z.iso.datetime();
const validDate = (value: unknown) =>
	typeof value === "string" && isoDate.safeParse(value).success ? value : "";
const validDateTime = (value: unknown) =>
	typeof value === "string" && isoDateTime.safeParse(value).success
		? value
		: new Date().toISOString();

export function prepareIndexSheetWrite(data: Partial<IndexSheetData>) {
	const base = createBlankIndexSheet();
	const normalizedData = {
		...base,
		...data,
		exportedAt: validDateTime(data.exportedAt),
		title: data.title?.trim() || "INDEX",
		rowsPerPage: 10 as const,
		showPageNo: Boolean(data.showPageNo),
		entries: (data.entries ?? []).map((entry) => ({
			name: entry.name ?? "",
			issueDate: validDate(entry.issueDate),
			submitDate: validDate(entry.submitDate),
			pageNo: entry.pageNo ?? "",
		})),
	};
	return {
		type: "index_sheet" as const,
		title: normalizedData.title,
		data: normalizedData,
		logoDataUrl: null,
	};
}

export function prepareCoverPageWrite(data: Partial<CoverPageData>) {
	const base = createBlankCoverPage();
	const draft = {
		...base,
		...data,
		exportedAt: validDateTime(data.exportedAt),
		type: "cover-page" as const,
		docType: data.docType?.trim() || "Cover Page",
		submittedBy: { ...base.submittedBy, ...data.submittedBy },
		submittedTo: { ...base.submittedTo, ...data.submittedTo },
	};
	const storedLogo = inlineLogoStorage.normalize(draft.logoDataUrl);
	const normalizedData = inlineLogoStorage.toDocumentData(draft, storedLogo);
	return {
		type: "cover_page" as const,
		title: draft.docType,
		data: normalizedData,
		logoDataUrl: storedLogo,
	};
}

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
		const input = prepareIndexSheetWrite(data);
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
		const input = prepareCoverPageWrite(data);
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
