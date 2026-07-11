import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CoverPageEditor } from "#/features/cover-page/cover-page-editor";
import { createBlankCoverPage } from "#/features/cover-page/defaults";
import { useCoverPageDocument } from "#/features/editor/use-document-editor";
import { useUnsavedWarning } from "#/features/editor/use-unsaved-warning";
import { getDocumentPresetData } from "#/features/presets/presets";

export const Route = createFileRoute("/_auth/cover-page/new")({
	validateSearch: (search) => ({
		preset: typeof search.preset === "string" ? search.preset : undefined,
	}),
	component: NewCoverPage,
});

function NewCoverPage() {
	const { preset } = Route.useSearch();
	const editor = useCoverPageDocument();
	const [isDirty, setIsDirty] = useState(false);
	useUnsavedWarning(isDirty);
	return (
		<CoverPageEditor
			initialData={
				getDocumentPresetData(preset, "cover_page") ?? createBlankCoverPage()
			}
			isSaving={editor.isSaving}
			onDirtyChange={setIsDirty}
			onSave={editor.save}
		/>
	);
}
