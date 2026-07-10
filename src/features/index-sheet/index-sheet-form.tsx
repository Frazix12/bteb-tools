import { Pencil, Trash2 } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Switch } from "#/components/ui/switch";
import type { IndexSheetData } from "#/orpc/schemas/document";
import { formatIndexDate } from "./format-date";
import { type RowDraft, RowEditor } from "./row-editor";

interface Props {
	data: IndexSheetData;
	rowDraft: RowDraft;
	editingIndex: number | null;
	rowError: string | null;
	onChange: (data: IndexSheetData) => void;
	onRowChange: (row: RowDraft) => void;
	onRowSubmit: () => void;
	onEdit: (index: number) => void;
	onCancelEdit: () => void;
	onDelete: (index: number) => void;
}

export function IndexSheetForm(props: Props) {
	const { data } = props;
	return (
		<div className="space-y-5">
			<div className="space-y-2">
				<Label htmlFor="sheet-title">Sheet title</Label>
				<Input
					id="sheet-title"
					value={data.title}
					onChange={(event) =>
						props.onChange({ ...data, title: event.target.value })
					}
				/>
			</div>
			<div className="flex items-center gap-3 rounded-lg border bg-card p-3">
				<Switch
					id="page-number-toggle"
					checked={data.showPageNo}
					onCheckedChange={(checked) =>
						props.onChange({ ...data, showPageNo: checked })
					}
				/>
				<Label htmlFor="page-number-toggle" className="normal-case">
					Include a Page No. column (after name)
				</Label>
			</div>
			<RowEditor
				draft={props.rowDraft}
				editing={props.editingIndex !== null}
				error={props.rowError}
				showPageNo={data.showPageNo}
				onCancel={props.onCancelEdit}
				onChange={props.onRowChange}
				onSubmit={props.onRowSubmit}
			/>
			<div className="border-t pt-5">
				{data.entries.length === 0 ? (
					<p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
						No rows yet — add your first experiment above.
					</p>
				) : (
					<div className="space-y-1">
						{data.entries.map((entry, index) => (
							<div
								className={`grid grid-cols-[2rem_1fr_auto] gap-2 rounded-md border-b p-2 ${props.editingIndex === index ? "bg-accent" : ""}`}
								key={`${entry.name}-${entry.pageNo}-${entry.issueDate}-${entry.submitDate}`}
							>
								<span className="font-semibold text-muted-foreground">
									{String(index + 1).padStart(2, "0")}
								</span>
								<div>
									<b className="block font-[Kalpurush,'Noto_Sans_Bengali',sans-serif]">
										{entry.name}
									</b>
									<span className="text-xs text-muted-foreground">
										{formatIndexDate(entry.issueDate) || "xx/xx/xx"} →{" "}
										{formatIndexDate(entry.submitDate) || "xx/xx/xx"}
										{data.showPageNo && entry.pageNo
											? ` · p.${entry.pageNo}`
											: ""}
									</span>
								</div>
								<div>
									<Button
										aria-label={`Edit ${entry.name}`}
										size="icon"
										variant="ghost"
										onClick={() => props.onEdit(index)}
									>
										<Pencil />
									</Button>
									<Button
										aria-label={`Delete ${entry.name}`}
										size="icon"
										variant="ghost"
										onClick={() => props.onDelete(index)}
									>
										<Trash2 />
									</Button>
								</div>
							</div>
						))}
					</div>
				)}
				{data.entries.length > 0 && (
					<p className="mt-2 text-center text-xs text-muted-foreground">
						{data.entries.length} row{data.entries.length === 1 ? "" : "s"}{" "}
						added
					</p>
				)}
			</div>
		</div>
	);
}
