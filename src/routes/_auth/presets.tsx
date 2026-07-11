import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	FileQuestion,
	FileText,
	LibraryBig,
	LoaderCircle,
	WandSparkles,
} from "lucide-react";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import type { DocumentType } from "#/features/documents/types";
import { presetListQueryOptions } from "#/features/presets/queries";

export const Route = createFileRoute("/_auth/presets")({
	component: PresetsPage,
});

type PresetListItem = {
	slug: string;
	title: string;
	description: string;
	type: DocumentType;
};

function presetHref(preset: PresetListItem) {
	return preset.type === "cover_page" ? "/cover-page/new" : "/index-sheet/new";
}

function typeLabel(type: DocumentType) {
	return type === "cover_page" ? "Cover page" : "Index sheet";
}

function PresetsPage() {
	const query = useQuery(presetListQueryOptions());
	return (
		<main className="page-wrap py-10">
			<div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
				<div>
					<p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--palm)]">
						<LibraryBig className="size-4" />
						Presets
					</p>
					<h1 className="font-serif text-4xl font-bold">Start from a preset</h1>
					<p className="mt-2 max-w-2xl text-muted-foreground">
						Choose a preset, edit the details, then save it as your own
						document.
					</p>
				</div>
				<Button asChild variant="outline">
					<Link to="/dashboard">
						<ArrowLeft />
						Back to dashboard
					</Link>
				</Button>
			</div>
			{query.isPending ? (
				<p className="inline-flex items-center gap-2">
					<LoaderCircle className="size-4 animate-spin" />
					Loading presets…
				</p>
			) : query.data?.length ? (
				<PresetCards presets={query.data} />
			) : (
				<p className="inline-flex items-center gap-2 text-muted-foreground">
					<FileQuestion className="size-4" />
					No presets are available.
				</p>
			)}
		</main>
	);
}

export function PresetCards({ presets }: { presets: PresetListItem[] }) {
	return (
		<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			{presets.map((preset) => (
				<Card key={preset.slug}>
					<CardHeader>
						<CardDescription className="inline-flex items-center gap-2">
							<FileText className="size-4" />
							{typeLabel(preset.type)}
						</CardDescription>
						<CardTitle>{preset.title}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-sm text-muted-foreground">
							{preset.description}
						</p>
						<Button asChild>
							<Link search={{ preset: preset.slug }} to={presetHref(preset)}>
								<WandSparkles />
								Use preset
							</Link>
						</Button>
					</CardContent>
				</Card>
			))}
		</section>
	);
}
