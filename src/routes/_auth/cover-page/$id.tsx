import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { requireSession } from "#/features/auth/require-session";
import { CoverPageEditor } from "#/features/cover-page/cover-page-editor";
import { inlineLogoStorage } from "#/features/cover-page/logo-storage";
import { useCoverPageDocument } from "#/features/editor/use-document-editor";
import { useUnsavedWarning } from "#/features/editor/use-unsaved-warning";
import type { CoverPageData } from "#/orpc/schemas/document";

export const Route = createFileRoute("/_auth/cover-page/$id")({
	beforeLoad: ({ location }) => requireSession(location.href),
	component: EditCoverPage,
});

function EditCoverPage() {
	const { id } = Route.useParams();
	const editor = useCoverPageDocument(id);
	const [isDirty, setIsDirty] = useState(false);
	useUnsavedWarning(isDirty);
	if (editor.documentQuery.isLoading)
		return <output className="block p-8">Loading cover page…</output>;
	if (editor.documentQuery.error || !editor.documentQuery.data)
		return (
			<div className="p-8" role="alert">
				<h1 className="text-xl font-semibold">Cover page not found</h1>
				<p className="text-muted-foreground">
					It may have been deleted or you may not have access to it.
				</p>
			</div>
		);
	const document = editor.documentQuery.data;
	const initialData = inlineLogoStorage.toDocumentData(
		document.data as CoverPageData,
		document.logoDataUrl,
	);
	return (
		<CoverPageEditor
			key={id}
			initialData={initialData}
			isSaving={editor.isSaving}
			onDirtyChange={setIsDirty}
			onSave={editor.save}
		/>
	);
}
