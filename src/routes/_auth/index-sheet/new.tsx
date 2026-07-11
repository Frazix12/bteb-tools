import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	FileQuestion,
	LoaderCircle,
	RefreshCw,
	TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { useIndexSheetDocument } from "#/features/editor/use-document-editor";
import { useUnsavedWarning } from "#/features/editor/use-unsaved-warning";
import { createBlankIndexSheet } from "#/features/index-sheet/defaults";
import { IndexSheetEditor } from "#/features/index-sheet/index-sheet-editor";
import { isPresetNotFoundError } from "#/features/presets/preset-error";
import { presetQueryOptions } from "#/features/presets/queries";
import type { IndexSheetData } from "#/orpc/schemas/document";

export const Route = createFileRoute("/_auth/index-sheet/new")({
	validateSearch: (search) => ({
		preset: typeof search.preset === "string" ? search.preset : undefined,
	}),
	component: NewIndexSheet,
});

export function NewIndexSheet() {
	const { preset } = Route.useSearch();
	const query = useQuery({
		...presetQueryOptions(preset ?? "", "index_sheet"),
		enabled: Boolean(preset),
		retry: false,
	});
	if (preset && query.isPending)
		return (
			<p className="page-wrap inline-flex items-center gap-2 py-10">
				<LoaderCircle className="size-4 animate-spin" />
				Loading preset…
			</p>
		);
	if (preset && query.isError && !isPresetNotFoundError(query.error))
		return (
			<main className="page-wrap py-10">
				<p className="inline-flex items-center gap-2 text-lg font-semibold">
					<TriangleAlert />
					Could not load preset
				</p>
				<p className="mt-2 text-muted-foreground">
					The preset service could not be reached. Your editor has not been
					initialized.
				</p>
				<button
					className="mt-4 inline-flex items-center gap-2 underline"
					type="button"
					onClick={() => query.refetch()}
				>
					<RefreshCw className="size-4" />
					Retry
				</button>
			</main>
		);
	return (
		<PresetDocumentState
			preset={preset}
			data={query.data?.data as IndexSheetData | undefined}
			notFound={Boolean(
				preset && query.isError && isPresetNotFoundError(query.error),
			)}
		/>
	);
}

export function PresetDocumentState({
	preset,
	data,
	notFound = false,
}: {
	preset?: string;
	data?: IndexSheetData;
	notFound?: boolean;
}) {
	const editor = useIndexSheetDocument();
	const [isDirty, setIsDirty] = useState(false);
	useUnsavedWarning(isDirty);
	if (notFound)
		return (
			<main className="page-wrap py-10">
				<p className="inline-flex items-center gap-2 text-lg font-semibold">
					<FileQuestion />
					Preset not found
				</p>
				<p className="mt-2 text-muted-foreground">
					This preset is unavailable or is not an index sheet.
				</p>
				<Link
					className="mt-4 inline-block underline"
					to="/index-sheet/new"
					search={{ preset: undefined }}
				>
					Start blank
				</Link>
			</main>
		);
	return (
		<IndexSheetEditor
			key={preset ?? "blank"}
			initialData={data ?? createBlankIndexSheet()}
			isSaving={editor.isSaving}
			onDirtyChange={setIsDirty}
			onSave={editor.save}
		/>
	);
}
