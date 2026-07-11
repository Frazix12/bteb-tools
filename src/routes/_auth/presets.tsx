import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, LibraryBig, WandSparkles } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { documentPresets } from "#/features/presets/presets";

export const Route = createFileRoute("/_auth/presets")({
	component: PresetsPage,
});

function presetHref(preset: (typeof documentPresets)[number]) {
	return preset.type === "cover_page" ? "/cover-page/new" : "/index-sheet/new";
}

function typeLabel(type: (typeof documentPresets)[number]["type"]) {
	return type === "cover_page" ? "Cover page" : "Index sheet";
}

function PresetsPage() {
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
			<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{documentPresets.map((preset) => (
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
		</main>
	);
}
