import { createFileRoute } from "@tanstack/react-router";
import { useIndexSheetDocument } from "#/features/editor/use-document-editor";
import { IndexSheetEditor } from "#/features/index-sheet/index-sheet-editor";
import type { IndexSheetData } from "#/orpc/schemas/document";

export const Route = createFileRoute("/_auth/index-sheet/$id")({
	component: EditIndexSheet,
});

function EditIndexSheet() {
	const { id } = Route.useParams();
	const editor = useIndexSheetDocument(id);
	if (editor.documentQuery.isLoading)
		return <output className="block p-8">Loading index sheet…</output>;
	if (editor.documentQuery.error || !editor.documentQuery.data)
		return (
			<div className="p-8" role="alert">
				<h1 className="text-xl font-semibold">Index sheet not found</h1>
				<p className="text-muted-foreground">
					It may have been deleted or you may not have access to it.
				</p>
			</div>
		);
	return (
		<IndexSheetEditor
			key={id}
			initialData={editor.documentQuery.data.data as IndexSheetData}
			isSaving={editor.isSaving}
			onSave={editor.save}
		/>
	);
}
