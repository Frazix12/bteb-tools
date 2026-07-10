import { Sparkles } from "lucide-react";
import { useState } from "react";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import type { CoverPageData, IndexSheetData } from "#/orpc/schemas/document";
import type { AutofillResult } from "./extract";

type Props =
	| {
			type: "index_sheet";
			current: IndexSheetData;
			onExtract: (text: string) => Promise<AutofillResult>;
			onApply: (data: IndexSheetData) => void;
	  }
	| {
			type: "cover_page";
			current: CoverPageData;
			onExtract: (text: string) => Promise<AutofillResult>;
			onApply: (data: CoverPageData) => void;
	  };

interface Suggestion {
	path: string;
	label: string;
	current: unknown;
	value: unknown;
	conflict: boolean;
}

const labels: Record<string, string> = {
	title: "Sheet title",
	showPageNo: "Show page numbers",
	instituteName: "Institution name",
	instituteShort: "Institution short form",
	department: "Department",
	docType: "Document type",
	"submittedBy.name": "Submitted by name",
	"submittedBy.regNo": "Registration no.",
	"submittedBy.roll": "Roll no.",
	"submittedBy.subjectName": "Subject name",
	"submittedBy.subjectCode": "Subject code",
	"submittedBy.session": "Session",
	"submittedBy.semester": "Semester",
	"submittedTo.name": "Submitted to name",
	"submittedTo.designation": "Designation",
	"submittedTo.department": "Submitted to department",
	entries: "Replace all index entries",
};

function valueAt(value: unknown, path: string): unknown {
	return path.split(".").reduce<unknown>((item, key) => {
		if (!item || typeof item !== "object") return undefined;
		return (item as Record<string, unknown>)[key];
	}, value);
}

function setAt<T>(value: T, path: string, next: unknown): T {
	const keys = path.split(".");
	const copy = structuredClone(value);
	let target = copy as Record<string, unknown>;
	for (const key of keys.slice(0, -1)) {
		target[key] = { ...(target[key] as Record<string, unknown>) };
		target = target[key] as Record<string, unknown>;
	}
	target[keys.at(-1) as string] = next;
	return copy;
}

function isNonempty(value: unknown) {
	return (
		value !== undefined &&
		value !== null &&
		value !== "" &&
		(!Array.isArray(value) || value.length > 0)
	);
}

function suggestionsFor(current: unknown, patch: unknown): Suggestion[] {
	const suggestions: Suggestion[] = [];
	const visit = (value: unknown, prefix = "") => {
		if (!value || typeof value !== "object" || Array.isArray(value)) return;
		for (const [key, item] of Object.entries(value)) {
			const path = prefix ? `${prefix}.${key}` : key;
			if (path === "entries" || typeof item !== "object" || item === null) {
				const currentValue = valueAt(current, path);
				suggestions.push({
					path,
					label: labels[path] ?? path,
					current: currentValue,
					value: item,
					conflict:
						path !== "entries" &&
						isNonempty(currentValue) &&
						JSON.stringify(currentValue) !== JSON.stringify(item),
				});
			} else visit(item, path);
		}
	};
	visit(patch);
	return suggestions;
}

function display(value: unknown) {
	if (Array.isArray(value)) return `${value.length} entries`;
	if (typeof value === "boolean") return value ? "Yes" : "No";
	return String(value ?? "");
}

function failureMessage(error: unknown) {
	const message = error instanceof Error ? error.message : "";
	if (message.includes("quota") || message.includes("TOO_MANY_REQUESTS"))
		return "AI autofill quota reached. Try again after the retry time.";
	if (message.includes("meaningful") || message.includes("UNPROCESSABLE"))
		return "No meaningful fields could be extracted. Add more detail and try again.";
	return "AI extraction is temporarily unavailable. Please try again later.";
}

export function AutofillDialog(props: Props) {
	const [open, setOpen] = useState(false);
	const [text, setText] = useState("");
	const [pending, setPending] = useState(false);
	const [result, setResult] = useState<AutofillResult | null>(null);
	const [overwrites, setOverwrites] = useState<Set<string>>(new Set());
	const [error, setError] = useState<string | null>(null);
	const suggestions = result ? suggestionsFor(props.current, result.patch) : [];

	const reset = () => {
		setText("");
		setResult(null);
		setOverwrites(new Set());
		setError(null);
	};
	const extract = async () => {
		if (text.trim().length < 10) {
			setError("Paste at least 10 characters to extract details.");
			return;
		}
		setError(null);
		setPending(true);
		try {
			setResult(await props.onExtract(text.trim()));
			setOverwrites(new Set());
		} catch (cause) {
			setError(failureMessage(cause));
		} finally {
			setPending(false);
		}
	};
	const apply = () => {
		let next = props.current;
		for (const suggestion of suggestions) {
			if (!suggestion.conflict || overwrites.has(suggestion.path))
				next = setAt(next, suggestion.path, suggestion.value);
		}
		(props.onApply as (data: typeof next) => void)(next);
		setOpen(false);
		reset();
	};

	return (
		<AlertDialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) reset();
			}}
		>
			<AlertDialogTrigger asChild>
				<Button variant="outline">
					<Sparkles />
					AI autofill
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent className="max-h-[90vh] overflow-y-auto">
				<AlertDialogHeader>
					<AlertDialogTitle>
						{result ? "Review suggested changes" : "AI autofill"}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{result
							? "Existing values are preserved unless you choose to overwrite them."
							: "Paste source text. Nothing changes until you review and apply."}
					</AlertDialogDescription>
				</AlertDialogHeader>
				{result ? (
					<div className="space-y-3">
						{result.warnings.map((warning) => (
							<p className="text-sm text-amber-700" key={warning}>
								{warning}
							</p>
						))}
						{suggestions.map((suggestion) => (
							<div
								className="rounded-md border p-3 text-sm"
								key={suggestion.path}
							>
								<p className="font-medium">{suggestion.label}</p>
								{suggestion.conflict && (
									<p className="text-muted-foreground">
										Current: {display(suggestion.current)}
									</p>
								)}
								<p>Suggested: {display(suggestion.value)}</p>
								{suggestion.conflict && (
									<Label className="mt-2 flex items-center gap-2">
										<input
											type="checkbox"
											checked={overwrites.has(suggestion.path)}
											onChange={(event) =>
												setOverwrites((current) => {
													const next = new Set(current);
													if (event.target.checked) next.add(suggestion.path);
													else next.delete(suggestion.path);
													return next;
												})
											}
										/>
										Overwrite {suggestion.label}
									</Label>
								)}
							</div>
						))}
					</div>
				) : (
					<div className="space-y-2">
						<Label htmlFor={`autofill-${props.type}`}>Source text</Label>
						<Textarea
							id={`autofill-${props.type}`}
							rows={8}
							value={text}
							disabled={pending}
							onChange={(event) => setText(event.target.value)}
						/>
					</div>
				)}
				{error && (
					<p role="alert" className="text-sm text-destructive">
						{error}
					</p>
				)}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
					{result ? (
						<Button onClick={apply}>Apply selected</Button>
					) : (
						<Button disabled={pending} onClick={() => void extract()}>
							{pending ? "Extracting…" : "Extract details"}
						</Button>
					)}
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
