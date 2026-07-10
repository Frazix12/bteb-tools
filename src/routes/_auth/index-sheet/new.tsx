import { createFileRoute } from "@tanstack/react-router";
import { useIndexSheetDocument } from "#/features/editor/use-document-editor";
import { createBlankIndexSheet } from "#/features/index-sheet/defaults";
import { IndexSheetEditor } from "#/features/index-sheet/index-sheet-editor";

export const Route = createFileRoute("/_auth/index-sheet/new")({
	component: NewIndexSheet,
});

function NewIndexSheet() {
	const editor = useIndexSheetDocument();
	return (
		<IndexSheetEditor
			initialData={createBlankIndexSheet()}
			isSaving={editor.isSaving}
			onSave={editor.save}
		/>
	);
}
