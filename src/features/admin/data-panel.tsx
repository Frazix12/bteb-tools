import { Database, Trash2 } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Confirm } from "./admin-dashboard";
export function DataPanel({ summary, data, onDelete, onPage, pending }: any) {
	return (
		<section aria-labelledby="data-title">
			<h2 id="data-title" className="flex gap-2 text-xl font-semibold">
				<Database aria-hidden="true" />
				Data
			</h2>
			<p>
				{summary.users} users · {summary.documents} documents ·{" "}
				{summary.presets} presets
			</p>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr>
							<th>Title</th>
							<th>Owner</th>
							<th>Type</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						{data.items.map((d: any) => (
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
											disabled={pending === `document:${d.id}`}
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
			</div>
			<Button
				variant="outline"
				aria-label="Next page"
				disabled={data.page * data.pageSize >= data.total}
				onClick={() => onPage("documents", data.page + 1)}
			>
				Next page
			</Button>
		</section>
	);
}
