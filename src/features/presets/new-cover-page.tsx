import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	FileQuestion,
	LoaderCircle,
	RefreshCw,
	TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { CoverPageEditor } from "#/features/cover-page/cover-page-editor";
import { createBlankCoverPage } from "#/features/cover-page/defaults";
import { useCoverPageDocument } from "#/features/editor/use-document-editor";
import { useUnsavedWarning } from "#/features/editor/use-unsaved-warning";
import { isPresetNotFoundError } from "#/features/presets/preset-error";
import { presetQueryOptions } from "#/features/presets/queries";
import type { CoverPageData } from "#/orpc/schemas/document";

export function NewCoverPage({
	preset,
	isAuthenticated,
	signInRedirect,
}: {
	preset?: string;
	isAuthenticated: boolean;
	signInRedirect: string;
}) {
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
		<CoverPresetDocumentState
			isAuthenticated={isAuthenticated}
			signInRedirect={signInRedirect}
			preset={preset}
			data={query.data?.data as CoverPageData | undefined}
			notFound={Boolean(
				preset && query.isError && isPresetNotFoundError(query.error),
			)}
		/>
	);
}

export function CoverPresetDocumentState({
	preset,
	data,
	notFound = false,
	isAuthenticated = true,
	signInRedirect,
}: {
	preset?: string;
	data?: CoverPageData;
	notFound?: boolean;
	isAuthenticated?: boolean;
	signInRedirect?: string;
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
			canSave={isAuthenticated}
			canUseAi={isAuthenticated}
			signInRedirect={signInRedirect}
			onDirtyChange={setIsDirty}
			onSave={editor.save}
		/>
	);
}
