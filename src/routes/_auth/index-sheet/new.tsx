import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useIndexSheetDocument } from "#/features/editor/use-document-editor";
import { useUnsavedWarning } from "#/features/editor/use-unsaved-warning";
import { createBlankIndexSheet } from "#/features/index-sheet/defaults";
import { getDocumentPresetData } from "#/features/presets/presets";
import { IndexSheetEditor } from "#/features/index-sheet/index-sheet-editor";

export const Route = createFileRoute("/_auth/index-sheet/new")({
	validateSearch: (search) => ({
		preset: typeof search.preset === "string" ? search.preset : undefined,
	}),
	component: NewIndexSheet,
});

function NewIndexSheet() {
	const { preset } = Route.useSearch();
	const editor = useIndexSheetDocument();
	const [isDirty, setIsDirty] = useState(false);
	useUnsavedWarning(isDirty);
	return (
		<IndexSheetEditor
			initialData={
				getDocumentPresetData(preset, "index_sheet") ?? createBlankIndexSheet()
			}
			isSaving={editor.isSaving}
			onDirtyChange={setIsDirty}
			onSave={editor.save}
		/>
	);
}
