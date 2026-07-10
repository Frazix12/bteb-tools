import { Copy } from "lucide-react";

import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import type { DocumentType } from "#/features/documents/types";

import { DeleteDocumentDialog } from "./delete-document-dialog";

export interface DocumentSummary {
	id: string;
	type: DocumentType;
	title: string;
	createdAt: Date;
	updatedAt: Date;
}

const labels: Record<DocumentType, string> = {
	index_sheet: "Index Sheet",
	cover_page: "Cover Page",
};

export function documentHref(document: Pick<DocumentSummary, "id" | "type">) {
	return `/${document.type === "index_sheet" ? "index-sheet" : "cover-page"}/${document.id}`;
}

export function DocumentCard({
	document,
	locale,
	isDuplicating,
	isDeleting,
	onDuplicate,
	onDelete,
}: {
	document: DocumentSummary;
	locale?: string;
	isDuplicating: boolean;
	isDeleting: boolean;
	onDuplicate: () => void;
	onDelete: () => void;
}) {
	const date = new Intl.DateTimeFormat(locale, {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(document.updatedAt);
	return (
		<Card
			className="gap-4 border-[var(--line)] bg-[var(--surface-strong)]"
			data-testid="document-card"
		>
			<CardHeader>
				<p className="text-xs font-semibold uppercase tracking-wider text-[var(--palm)]">
					{labels[document.type]}
				</p>
				<CardTitle>{document.title}</CardTitle>
				<p className="text-sm text-muted-foreground">Updated {date}</p>
			</CardHeader>
			<CardContent>
				<Button asChild className="w-full">
					<a
						aria-label={`Open ${document.title}`}
						href={documentHref(document)}
					>
						Open
					</a>
				</Button>
			</CardContent>
			<CardFooter
				aria-label={`Actions for ${document.title}`}
				className="justify-end gap-1"
				role="group"
			>
				<Button
					aria-label={
						isDuplicating
							? `Duplicating ${document.title}`
							: `Duplicate ${document.title}`
					}
					disabled={isDuplicating || isDeleting}
					onClick={onDuplicate}
					size="sm"
					variant="ghost"
				>
					<Copy aria-hidden="true" />
					{isDuplicating ? "Duplicating…" : "Duplicate"}
				</Button>
				<DeleteDocumentDialog
					isPending={isDeleting}
					onConfirm={onDelete}
					title={document.title}
				/>
			</CardFooter>
		</Card>
	);
}
