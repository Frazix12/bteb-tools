import { Database, Trash2 } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Confirm } from "./admin-dashboard";
import { AdminPanel, AdminStat, tableClass } from "./admin-ui";
import type { AdminDocument, Page, PageKind, Summary } from "./types";

type Props = {
	summary: Summary;
	data: Page<AdminDocument>;
	onDelete: (id: string) => void;
	onPage: (k: PageKind, p: number) => void;
	pending: boolean;
};
export function DataPanel({ summary, data, onDelete, onPage, pending }: Props) {
	return (
		<AdminPanel
			title="Data"
			description="Inspect database totals and remove documents when necessary."
			icon={<Database aria-hidden="true" className="size-5" />}
		>
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<AdminStat label="Users" value={summary.users} />
				<AdminStat label="Documents" value={summary.documents} />
				<AdminStat label="Enabled presets" value={summary.enabledPresets} />
				<AdminStat label="AI requests" value={summary.aiRequests} />
			</div>
			<section
				aria-label="Documents table"
				className="overflow-x-auto rounded-xl border border-[var(--line)]"
				// biome-ignore lint/a11y/noNoninteractiveTabindex: Scrollable tables must be keyboard focusable.
				tabIndex={0}
			>
				<table data-admin-table className={tableClass}>
					<thead>
						<tr>
							<th>Title</th>
							<th>Owner</th>
							<th>Type</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						{data.items.length === 0 && (
							<tr>
								<td
									colSpan={4}
									className="py-10 text-center text-muted-foreground"
								>
									No documents have been saved yet.
								</td>
							</tr>
						)}
						{data.items.map((d) => (
							<tr key={d.id}>
								<td>{d.title}</td>
								<td>{d.ownerEmail}</td>
								<td>{d.type}</td>
								<td>
									<Confirm
										title={`Delete ${d.title}?`}
										description="This permanently deletes the document."
										action="Delete permanently"
										onConfirm={() => onDelete(d.id)}
									>
										<Button
											variant="destructive"
											disabled={pending}
											aria-label={`Delete ${d.title}`}
										>
											<Trash2 aria-hidden="true" />
										</Button>
									</Confirm>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</section>
			<div className="flex justify-end">
				<Button
					variant="outline"
					aria-label="Next page"
					disabled={pending || data.page * data.pageSize >= data.total}
					onClick={() => onPage("documents", data.page + 1)}
				>
					Next page
				</Button>
			</div>
		</AdminPanel>
	);
}
