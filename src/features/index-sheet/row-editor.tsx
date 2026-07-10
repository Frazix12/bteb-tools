import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";

export type RowDraft = {
	name: string;
	pageNo: string;
	issueDate: string;
	submitDate: string;
};

interface RowEditorProps {
	draft: RowDraft;
	editing: boolean;
	error: string | null;
	showPageNo: boolean;
	onCancel: () => void;
	onChange: (draft: RowDraft) => void;
	onSubmit: () => void;
}

export function RowEditor({
	draft,
	editing,
	error,
	showPageNo,
	onCancel,
	onChange,
	onSubmit,
}: RowEditorProps) {
	const set = (key: keyof RowDraft, value: string) =>
		onChange({ ...draft, [key]: value });
	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="experiment-name">Experiment name</Label>
				<Textarea
					id="experiment-name"
					className="font-[Kalpurush,'Noto_Sans_Bengali',sans-serif] text-base"
					value={draft.name}
					onChange={(event) => set("name", event.target.value)}
				/>
			</div>
			{showPageNo && (
				<div className="space-y-2">
					<Label htmlFor="page-no">Page no.</Label>
					<Input
						id="page-no"
						value={draft.pageNo}
						onChange={(event) => set("pageNo", event.target.value)}
						placeholder="e.g. 1-4"
					/>
				</div>
			)}
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="issue-date">Issue date</Label>
					<Input
						id="issue-date"
						type="date"
						value={draft.issueDate}
						onChange={(event) => set("issueDate", event.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="submit-date">Submit date</Label>
					<Input
						id="submit-date"
						type="date"
						value={draft.submitDate}
						onChange={(event) => set("submitDate", event.target.value)}
					/>
				</div>
			</div>
			{error && (
				<p className="text-sm text-destructive" role="alert">
					{error}
				</p>
			)}
			<Button className="w-full" onClick={onSubmit} type="button">
				{editing ? "Update row" : "Add row"}
			</Button>
			{editing && (
				<Button
					className="w-full"
					onClick={onCancel}
					type="button"
					variant="outline"
				>
					Cancel edit
				</Button>
			)}
		</div>
	);
}
