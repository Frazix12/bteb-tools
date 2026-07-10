import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { Download, Printer, Save, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import {
	parseLegacyDocument,
	serializeLegacyDocument,
} from "#/features/documents/legacy-json";
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
	onExport?: (data: IndexSheetData) => void;
	onSave: (data: IndexSheetData) => Promise<unknown>;
}

function downloadJson(data: IndexSheetData) {
	const json = serializeLegacyDocument(data);
	const blob = new Blob([json], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	const safeTitle =
		(data.title || "index-sheet")
			.trim()
			.replace(/[^a-z0-9\-_]+/gi, "_")
			.toLowerCase() || "index-sheet";
	anchor.href = url;
	anchor.download = `${safeTitle}.json`;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}

export function IndexSheetEditor({
	initialData,
	isSaving = false,
	onDirtyChange,
	onExport,
	onSave,
}: Props) {
	const form = useForm({ defaultValues: initialData });
	const data = useStore(form.store, (state) => state.values);
	const [rowDraft, setRowDraft] = useState(blankRow);
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const [rowError, setRowError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const initial = useRef(JSON.stringify(initialData));
	const fileRef = useRef<HTMLInputElement>(null);

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
	const importFile = async (file?: File) => {
		if (!file) return;
		try {
			const parsed = parseLegacyDocument(await file.text(), "index_sheet");
			if (!parsed.ok) setMessage(parsed.message);
			else {
				changeData(parsed.data);
				cancelEdit();
				setMessage("Index sheet imported.");
			}
		} catch {
			setMessage("Could not read that file as JSON.");
		} finally {
			if (fileRef.current) fileRef.current.value = "";
		}
	};
	const save = async () => {
		setMessage(null);
		try {
			await onSave(data);
			initial.current = JSON.stringify(data);
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
		<main className="grid min-h-[calc(100vh-4rem)] grid-cols-1 bg-muted/30 lg:grid-cols-[380px_1fr]">
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
							<Button disabled={isSaving} onClick={() => void save()}>
								<Save />
								{isSaving ? "Saving…" : "Save sheet"}
							</Button>
							<Button variant="outline" onClick={() => window.print()}>
								<Printer />
								Print or save as PDF
							</Button>
							<Button
								variant="outline"
								onClick={() => {
									const exportData = { ...data, title: data.title || "INDEX" };
									if (onExport) onExport(exportData);
									else downloadJson(exportData);
								}}
							>
								<Download />
								Export JSON
							</Button>
							<Button
								variant="outline"
								onClick={() => fileRef.current?.click()}
							>
								<Upload />
								Import JSON
							</Button>
						</div>
						<input
							aria-label="Import JSON file"
							className="sr-only"
							ref={fileRef}
							type="file"
							accept="application/json,.json"
							onChange={(event) => void importFile(event.target.files?.[0])}
						/>
					</CardContent>
				</Card>
			</section>
			<section className="overflow-auto p-4 sm:p-8">
				<IndexSheetPreview data={data} />
			</section>
		</main>
	);
}
