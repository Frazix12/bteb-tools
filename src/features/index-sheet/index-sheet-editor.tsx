import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { Printer, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { SignInAction } from "#/features/auth/sign-in-action";
import { AutofillDialog } from "#/features/autofill/autofill-dialog";
import { autofillExtractMutationOptions } from "#/features/autofill/queries";
import type { IndexSheetData } from "#/orpc/schemas/document";

import { IndexSheetForm } from "./index-sheet-form";
import { IndexSheetPreview } from "./index-sheet-preview";
import type { RowDraft } from "./row-editor";

const blankRow = (): RowDraft => ({
	name: "",
	pageNo: "",
	issueDate: "",
	submitDate: "",
});

interface Props {
	initialData: IndexSheetData;
	isSaving?: boolean;
	onDirtyChange?: (dirty: boolean) => void;
	onSave: (data: IndexSheetData) => Promise<unknown>;
	canSave?: boolean;
	canUseAi?: boolean;
	signInRedirect?: string;
}

export function IndexSheetEditor({
	initialData,
	isSaving = false,
	onDirtyChange,
	onSave,
	canSave = true,
	canUseAi = true,
	signInRedirect,
}: Props) {
	const form = useForm({ defaultValues: initialData });
	const autofill = useMutation(autofillExtractMutationOptions());
	const data = useStore(form.store, (state) => state.values);
	const [rowDraft, setRowDraft] = useState(blankRow);
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const [rowError, setRowError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const initial = useRef(JSON.stringify(initialData));

	useEffect(
		() => onDirtyChange?.(JSON.stringify(data) !== initial.current),
		[data, onDirtyChange],
	);

	const changeData = (next: IndexSheetData) => {
		form.setFieldValue("title", next.title);
		form.setFieldValue("showPageNo", next.showPageNo);
		form.setFieldValue("entries", next.entries);
		form.setFieldValue("exportedAt", next.exportedAt);
	};
	const cancelEdit = () => {
		setEditingIndex(null);
		setRowDraft(blankRow());
		setRowError(null);
	};
	const submitRow = () => {
		const row = {
			...rowDraft,
			name: rowDraft.name.trim(),
			pageNo: rowDraft.pageNo.trim(),
		};
		if (!row.name) return setRowError("Experiment name is required.");
		if (data.showPageNo && !row.pageNo)
			return setRowError("Page number is required.");
		const entries = [...data.entries];
		if (editingIndex === null) entries.push(row);
		else entries[editingIndex] = row;
		changeData({ ...data, entries });
		cancelEdit();
	};
	const save = async () => {
		setMessage(null);
		try {
			const normalized = { ...data, title: data.title.trim() || "INDEX" };
			await onSave(normalized);
			changeData(normalized);
			initial.current = JSON.stringify(normalized);
			onDirtyChange?.(false);
			setMessage("Sheet saved.");
		} catch (error) {
			setMessage(
				error instanceof Error && error.message
					? error.message
					: "Could not save the sheet.",
			);
		}
	};

	return (
		<main
			className="editor-layout min-h-[calc(100vh-4rem)] bg-muted/30"
			data-editor-main
		>
			<section className="border-r bg-background p-5" data-print-hidden>
				<Card className="border-0 bg-transparent shadow-none">
					<CardHeader className="px-0 pt-0">
						<CardTitle>Index Sheet Generator</CardTitle>
						<CardDescription>
							Add experiments, set dates, then print.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-5 px-0">
						<IndexSheetForm
							data={data}
							editingIndex={editingIndex}
							rowDraft={rowDraft}
							rowError={rowError}
							onCancelEdit={cancelEdit}
							onChange={changeData}
							onDelete={(index) => {
								const entries = data.entries.filter((_, i) => i !== index);
								changeData({ ...data, entries });
								if (editingIndex === index) cancelEdit();
								else if (editingIndex !== null && index < editingIndex) {
									setEditingIndex(editingIndex - 1);
								}
							}}
							onEdit={(index) => {
								setEditingIndex(index);
								setRowDraft(data.entries[index]);
								setRowError(null);
							}}
							onRowChange={setRowDraft}
							onRowSubmit={submitRow}
						/>
						{message && (
							<p className="text-sm" role="alert">
								{message}
							</p>
						)}
						<div className="grid grid-cols-2 gap-2">
							<AutofillDialog
								type="index_sheet"
								current={data}
								canUseAi={canUseAi}
								signInRedirect={signInRedirect}
								onExtract={(text) =>
									autofill.mutateAsync({ type: "index_sheet", text })
								}
								onApply={changeData}
							/>
							{canSave ? (
								<Button
									disabled={isSaving}
									onClick={() => void save()}
									type="button"
								>
									<Save />
									{isSaving ? "Saving…" : "Save sheet"}
								</Button>
							) : (
								<SignInAction redirect={signInRedirect ?? "/presets"}>
									<Save />
									Sign in to save
								</SignInAction>
							)}
							<Button
								variant="outline"
								onClick={() => window.print()}
								type="button"
							>
								<Printer />
								Print or save as PDF
							</Button>
						</div>
					</CardContent>
				</Card>
			</section>
			<section className="preview-host" data-preview-host>
				<IndexSheetPreview data={data} />
			</section>
		</main>
	);
}
