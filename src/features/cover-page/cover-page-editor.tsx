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
import type { CoverPageData } from "#/orpc/schemas/document";
import { CoverPageForm } from "./cover-page-form";
import { CoverPagePreview } from "./cover-page-preview";
import { readLogo } from "./read-logo";

interface Props {
	initialData: CoverPageData;
	isSaving?: boolean;
	onDirtyChange?: (dirty: boolean) => void;
	onSave: (data: CoverPageData) => Promise<unknown>;
	canSave?: boolean;
	canUseAi?: boolean;
	signInRedirect?: string;
}

export function CoverPageEditor({
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
	const [message, setMessage] = useState<string | null>(null);
	const initial = useRef(JSON.stringify(initialData));

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
		<main
			className="editor-layout min-h-[calc(100vh-4rem)] bg-muted/30"
			data-editor-main
		>
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
								canUseAi={canUseAi}
								signInRedirect={signInRedirect}
								onExtract={(text) =>
									autofill.mutateAsync({ type: "cover_page", text })
								}
								onApply={changeData}
							/>
							{canSave ? (
								<Button disabled={isSaving} onClick={() => void save()}>
									<Save />
									{isSaving ? "Saving…" : "Save cover page"}
								</Button>
							) : (
								<SignInAction redirect={signInRedirect ?? "/presets"}>
									<Save />
									Sign in to save
								</SignInAction>
							)}
							<Button variant="outline" onClick={() => window.print()}>
								<Printer />
								Print or save as PDF
							</Button>
						</div>
					</CardContent>
				</Card>
			</section>
			<section className="preview-host" data-preview-host>
				<CoverPagePreview data={data} />
			</section>
		</main>
	);
}
