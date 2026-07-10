import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
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
import { AutofillDialog } from "#/features/autofill/autofill-dialog";
import { autofillExtractMutationOptions } from "#/features/autofill/queries";
import {
	parseLegacyDocument,
	serializeLegacyDocument,
} from "#/features/documents/legacy-json";
import type { CoverPageData } from "#/orpc/schemas/document";
import { CoverPageForm } from "./cover-page-form";
import { CoverPagePreview } from "./cover-page-preview";
import { readLogo } from "./read-logo";

interface Props {
	initialData: CoverPageData;
	isSaving?: boolean;
	onDirtyChange?: (dirty: boolean) => void;
	onExport?: (data: CoverPageData) => void;
	onSave: (data: CoverPageData) => Promise<unknown>;
}

function downloadJson(data: CoverPageData) {
	const url = URL.createObjectURL(
		new Blob([serializeLegacyDocument(data)], { type: "application/json" }),
	);
	const anchor = document.createElement("a");
	const title =
		data.docType
			.trim()
			.replace(/[^a-z0-9\-_]+/gi, "_")
			.toLowerCase() || "cover-page";
	anchor.href = url;
	anchor.download = `${title}.json`;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}

export function CoverPageEditor({
	initialData,
	isSaving = false,
	onDirtyChange,
	onExport,
	onSave,
}: Props) {
	const form = useForm({ defaultValues: initialData });
	const autofill = useMutation(autofillExtractMutationOptions());
	const data = useStore(form.store, (state) => state.values);
	const [message, setMessage] = useState<string | null>(null);
	const initial = useRef(JSON.stringify(initialData));
	const importRef = useRef<HTMLInputElement>(null);

	useEffect(
		() => onDirtyChange?.(JSON.stringify(data) !== initial.current),
		[data, onDirtyChange],
	);

	const changeData = (next: CoverPageData) => {
		form.setFieldValue("instituteName", next.instituteName);
		form.setFieldValue("instituteShort", next.instituteShort);
		form.setFieldValue("department", next.department);
		form.setFieldValue("docType", next.docType);
		form.setFieldValue("logoDataUrl", next.logoDataUrl);
		form.setFieldValue("submittedBy", next.submittedBy);
		form.setFieldValue("submittedTo", next.submittedTo);
		form.setFieldValue("exportedAt", next.exportedAt);
	};
	const importFile = async (file?: File) => {
		if (!file) return;
		try {
			const parsed = parseLegacyDocument(await file.text(), "cover_page");
			if (!parsed.ok) setMessage(parsed.message);
			else {
				changeData(parsed.data);
				setMessage("Cover page imported.");
			}
		} catch {
			setMessage("Could not read that file as JSON.");
		} finally {
			if (importRef.current) importRef.current.value = "";
		}
	};
	const uploadLogo = async (file?: File) => {
		if (!file) return;
		try {
			changeData({ ...data, logoDataUrl: await readLogo(file) });
			setMessage(null);
		} catch (error) {
			setMessage(
				error instanceof Error
					? error.message
					: "Could not read the logo file.",
			);
		}
	};
	const save = async () => {
		setMessage(null);
		try {
			await onSave(data);
			initial.current = JSON.stringify(data);
			onDirtyChange?.(false);
			setMessage("Cover page saved.");
		} catch (error) {
			setMessage(
				error instanceof Error && error.message
					? error.message
					: "Could not save the cover page.",
			);
		}
	};

	return (
		<main className="grid min-h-[calc(100vh-4rem)] grid-cols-1 bg-muted/30 lg:grid-cols-[400px_1fr]">
			<section className="border-r bg-background p-5" data-print-hidden>
				<Card className="border-0 bg-transparent shadow-none">
					<CardHeader className="px-0 pt-0">
						<CardTitle>Cover Page Generator</CardTitle>
						<CardDescription>
							Fill in the details below, review, then save or print.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-5 px-0">
						<CoverPageForm
							data={data}
							onChange={changeData}
							onLogoFile={(file) => void uploadLogo(file)}
							onRemoveLogo={() => changeData({ ...data, logoDataUrl: "" })}
						/>
						{message && (
							<p className="text-sm" role="alert">
								{message}
							</p>
						)}
						<div className="grid grid-cols-2 gap-2">
							<AutofillDialog
								type="cover_page"
								current={data}
								onExtract={(text) =>
									autofill.mutateAsync({ type: "cover_page", text })
								}
								onApply={changeData}
							/>
							<Button disabled={isSaving} onClick={() => void save()}>
								<Save />
								{isSaving ? "Saving…" : "Save cover page"}
							</Button>
							<Button variant="outline" onClick={() => window.print()}>
								<Printer />
								Print or save as PDF
							</Button>
							<Button
								variant="outline"
								onClick={() => (onExport ? onExport(data) : downloadJson(data))}
							>
								<Download />
								Export JSON
							</Button>
							<Button
								variant="outline"
								onClick={() => importRef.current?.click()}
							>
								<Upload />
								Import JSON
							</Button>
						</div>
						<input
							ref={importRef}
							className="sr-only"
							aria-label="Import JSON file"
							type="file"
							accept="application/json,.json"
							onChange={(event) => void importFile(event.target.files?.[0])}
						/>
					</CardContent>
				</Card>
			</section>
			<section className="overflow-auto p-4 sm:p-8">
				<CoverPagePreview data={data} />
			</section>
		</main>
	);
}
