import { Shield, Users } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Confirm } from "./admin-dashboard";
import { AdminPanel, tableClass } from "./admin-ui";
import type { AdminUser, Page, PageKind } from "./types";

type Props = {
	data: Page<AdminUser>;
	onRole: (u: AdminUser, r: "user" | "admin") => void;
	onPage: (k: PageKind, p: number) => void;
	pending: boolean;
	bootstrapEmail: string;
};
const joinedDate = (date: Date) =>
	new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeZone: "UTC",
	}).format(date);
export function UsersPanel({
	data,
	onRole,
	onPage,
	pending,
	bootstrapEmail,
}: Props) {
	return (
		<AdminPanel
			title="Users"
			description="Review accounts, activity, and administrative access."
			icon={<Users aria-hidden="true" className="size-5" />}
		>
			<section
				aria-label="Users table"
				className="overflow-x-auto rounded-xl border border-[var(--line)]"
				// biome-ignore lint/a11y/noNoninteractiveTabindex: Scrollable tables must be keyboard focusable.
				tabIndex={0}
			>
				<table data-admin-table className={tableClass}>
					<thead>
						<tr>
							<th>Name</th>
							<th>Email</th>
							<th>Role</th>
							<th>Joined</th>
							<th>Documents</th>
							<th>AI requests</th>
							<th>Tokens (in/out)</th>
							<th>Estimated cost</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						{data.items.map((u) => (
							<tr key={u.id}>
								<td>{u.name}</td>
								<td>{u.email}</td>
								<td>{u.role}</td>
								<td>{joinedDate(u.createdAt)}</td>
								<td>{u.documentCount}</td>
								<td>{u.aiRequests}</td>
								<td>
									{u.inputTokens ?? "Unknown"} / {u.outputTokens ?? "Unknown"}
								</td>
								<td>${(Number(u.costMicros || 0) / 1_000_000).toFixed(4)}</td>
								<td>
									{u.email.trim().toLowerCase() ===
									bootstrapEmail.trim().toLowerCase() ? (
										<>
											<Button
												disabled
												aria-label={`Change role for ${u.email}`}
											>
												<Shield aria-hidden="true" />
												Change role
											</Button>
											<span>Bootstrap admin</span>
										</>
									) : (
										<Confirm
											title={`Change role for ${u.email}?`}
											description="This changes the user's administrative access."
											action="Confirm role change"
											onConfirm={() =>
												onRole(u, u.role === "admin" ? "user" : "admin")
											}
										>
											<Button
												disabled={pending}
												aria-label={`Change role for ${u.email}`}
											>
												<Shield aria-hidden="true" />
												Change role
											</Button>
										</Confirm>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</section>
			<div
				data-admin-actions
				className="flex flex-wrap items-center justify-between gap-3"
			>
				<p className="text-sm text-muted-foreground">
					Page {data.page} · {data.total} users
				</p>
				<div className="flex gap-2">
					<Button
						variant="outline"
						disabled={pending || data.page <= 1}
						onClick={() => onPage("users", data.page - 1)}
					>
						Previous page
					</Button>
					<Button
						variant="outline"
						aria-label="Next page"
						disabled={pending || data.page * data.pageSize >= data.total}
						onClick={() => onPage("users", data.page + 1)}
					>
						Next page
					</Button>
				</div>
			</div>
		</AdminPanel>
	);
}
