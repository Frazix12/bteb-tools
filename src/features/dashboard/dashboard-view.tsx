import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";

import { DocumentCard, type DocumentSummary } from "./document-card";

interface DashboardViewProps {
	documents: DocumentSummary[];
	isLoading: boolean;
	error: string | null;
	actionError: string | null;
	pendingDuplicateId: string | null;
	pendingDeleteId: string | null;
	onRetry: () => void;
	onDuplicate: (id: string) => void;
	onDelete: (id: string) => void;
}

function NewDocumentActions() {
	return (
		<div className="flex flex-wrap gap-3">
			<Button asChild>
				<a href="/index-sheet/new">New Index Sheet</a>
			</Button>
			<Button asChild variant="outline">
				<a href="/cover-page/new">New Cover Page</a>
			</Button>
			<Button asChild variant="outline">
				<a href="/presets">Browse Presets</a>
			</Button>
		</div>
	);
}

export function DashboardView(props: DashboardViewProps) {
	return (
		<main className="page-wrap py-10">
			<div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
				<div>
					<p className="text-sm font-semibold uppercase tracking-wider text-[var(--palm)]">
						Workspace
					</p>
					<h1 className="font-serif text-4xl font-bold">Your documents</h1>
				</div>
				<NewDocumentActions />
			</div>
			{props.actionError && (
				<p
					className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
					role="alert"
				>
					{props.actionError}
				</p>
			)}
			{props.isLoading ? (
				<Card role="status">
					<CardContent>Loading documents…</CardContent>
				</Card>
			) : props.error ? (
				<Card>
					<CardHeader>
						<CardTitle>Couldn’t load documents</CardTitle>
						<CardDescription>{props.error}</CardDescription>
					</CardHeader>
					<CardContent>
						<Button onClick={props.onRetry} variant="outline">
							Try again
						</Button>
					</CardContent>
				</Card>
			) : props.documents.length === 0 ? (
				<Card className="border-dashed text-center">
					<CardHeader>
						<CardTitle>No saved documents yet</CardTitle>
						<CardDescription>
							Create an index sheet or cover page using the actions above.
						</CardDescription>
					</CardHeader>
				</Card>
			) : (
				<section
					aria-label="Saved documents"
					className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
				>
					{props.documents.map((document) => (
						<DocumentCard
							document={document}
							isDeleting={props.pendingDeleteId === document.id}
							isDuplicating={props.pendingDuplicateId === document.id}
							key={document.id}
							onDelete={() => props.onDelete(document.id)}
							onDuplicate={() => props.onDuplicate(document.id)}
						/>
					))}
				</section>
			)}
		</main>
	);
}
