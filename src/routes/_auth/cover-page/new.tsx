import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileQuestion, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { CoverPageEditor } from "#/features/cover-page/cover-page-editor";
import { createBlankCoverPage } from "#/features/cover-page/defaults";
import { useCoverPageDocument } from "#/features/editor/use-document-editor";
import { useUnsavedWarning } from "#/features/editor/use-unsaved-warning";
import { presetQueryOptions } from "#/features/presets/queries";
import type { CoverPageData } from "#/orpc/schemas/document";

export const Route = createFileRoute("/_auth/cover-page/new")({
	validateSearch: (search) => ({
		preset: typeof search.preset === "string" ? search.preset : undefined,
	}),
	component: NewCoverPage,
});

function NewCoverPage() {
	const { preset } = Route.useSearch();
	const query = useQuery({
		...presetQueryOptions(preset ?? "", "cover_page"),
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
	return (
		<PresetDocumentState
			preset={preset}
			data={query.data?.data as CoverPageData | undefined}
			notFound={Boolean(preset && query.isError)}
		/>
	);
}

export function PresetDocumentState({
	preset,
	data,
	notFound = false,
}: {
	preset?: string;
	data?: CoverPageData;
	notFound?: boolean;
}) {
	const editor = useCoverPageDocument();
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
					This preset is unavailable or is not a cover page.
				</p>
				<Link
					className="mt-4 inline-block underline"
					to="/cover-page/new"
					search={{ preset: undefined }}
				>
					Start blank
				</Link>
			</main>
		);
	return (
		<CoverPageEditor
			key={preset ?? "blank"}
			initialData={data ?? createBlankCoverPage()}
			isSaving={editor.isSaving}
			onDirtyChange={setIsDirty}
			onSave={editor.save}
		/>
	);
}
