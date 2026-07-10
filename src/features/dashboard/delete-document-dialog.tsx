import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";

interface DeleteDocumentDialogProps {
	title: string;
	isPending: boolean;
	onConfirm: () => void;
}

export function DeleteDocumentDialog({
	title,
	isPending,
	onConfirm,
}: DeleteDocumentDialogProps) {
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					aria-label={`Delete ${title}`}
					disabled={isPending}
					size="sm"
					variant="ghost"
				>
					Delete
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
					<AlertDialogDescription>
						This permanently deletes the document and cannot be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction disabled={isPending} onClick={onConfirm}>
						Delete permanently
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
