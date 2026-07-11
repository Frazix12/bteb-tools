import { ChartNoAxesCombined } from "lucide-react";
import { Button } from "#/components/ui/button";
import { AdminPanel, AdminStat } from "./admin-ui";
import type { Usage } from "./types";

const tokens = (value: number | string | null) =>
	value == null ? "Unknown" : value;
const pageCount = (total: number, pageSize: number) =>
	Math.max(1, Math.ceil(total / pageSize));

export function UsagePanel({
	data,
	onPage,
	pending,
}: {
	data: Usage;
	onPage: (kind: "date" | "user", page: number) => void;
	pending: boolean;
}) {
	const t = data.totals;
	return (
		<AdminPanel
			title="AI Usage"
			description="Estimated Gemini usage and cost, with privacy-safe operational totals."
			icon={<ChartNoAxesCombined aria-hidden="true" className="size-5" />}
		>
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<AdminStat label="Requests" value={t.events} />
				<AdminStat label="Input tokens" value={tokens(t.inputTokens)} />
				<AdminStat label="Output tokens" value={tokens(t.outputTokens)} />
				<AdminStat
					label="Estimated cost"
					value={`$${(Number(t.costMicros || 0) / 1_000_000).toFixed(4)}`}
				/>
			</div>
			<div className="grid gap-5 lg:grid-cols-2">
				<div className="rounded-xl border border-[var(--line)] p-4">
					<h3 className="font-semibold">By model</h3>
					<ul className="mt-3 space-y-2 text-sm">
						{data.byModel.map((x) => (
							<li key={`${x.provider}:${x.model}`}>
								{x.provider} / {x.model}: {x.events} requests ·{" "}
								{tokens(x.inputTokens)} input / {tokens(x.outputTokens)} output
								· ${(Number(x.costMicros || 0) / 1_000_000).toFixed(4)}
							</li>
						))}
						{data.byModel.length === 0 && (
							<li className="text-muted-foreground">
								No AI usage recorded yet.
							</li>
						)}
					</ul>
				</div>
				<div className="rounded-xl border border-[var(--line)] p-4">
					<h3 className="font-semibold">By outcome</h3>
					<ul className="mt-3 space-y-2 text-sm">
						{data.byOutcome.map((x) => (
							<li key={x.outcome}>
								{x.outcome}: {x.events} requests · $
								{(Number(x.costMicros || 0) / 1_000_000).toFixed(4)}
							</li>
						))}
						{data.byOutcome.length === 0 && (
							<li className="text-muted-foreground">
								No outcomes recorded yet.
							</li>
						)}
					</ul>
				</div>
			</div>
			<div className="grid gap-5 lg:grid-cols-2">
				<div className="rounded-xl border border-[var(--line)] p-4">
					<h3 className="font-semibold">By date</h3>
					<ul className="mt-3 space-y-2 text-sm">
						{data.byDate.map((x) => (
							<li key={x.date}>
								{x.date}: {x.events} requests · {tokens(x.inputTokens)} input /{" "}
								{tokens(x.outputTokens)} output · $
								{(Number(x.costMicros || 0) / 1_000_000).toFixed(4)}
							</li>
						))}
					</ul>
					<p className="mt-3 text-sm text-muted-foreground">
						Date page {data.datePage} of{" "}
						{pageCount(data.dateTotal, data.pageSize)} · {data.dateTotal} dates
					</p>
					<div className="mt-3 flex gap-2">
						<Button
							variant="outline"
							aria-label="Previous date page"
							disabled={pending || data.datePage <= 1}
							onClick={() => onPage("date", data.datePage - 1)}
						>
							Previous date page
						</Button>
						<Button
							variant="outline"
							aria-label="Next date page"
							disabled={
								pending || data.datePage * data.pageSize >= data.dateTotal
							}
							onClick={() => onPage("date", data.datePage + 1)}
						>
							Next date page
						</Button>
					</div>
				</div>
				<div className="rounded-xl border border-[var(--line)] p-4">
					<h3 className="font-semibold">By user</h3>
					<ul className="mt-3 space-y-2 text-sm">
						{data.byUser.map((x) => (
							<li key={x.ownerId}>
								{x.name || x.email}: {x.events} requests ·{" "}
								{tokens(x.inputTokens)} input / {tokens(x.outputTokens)} output
								· ${(Number(x.costMicros || 0) / 1_000_000).toFixed(4)}
							</li>
						))}
					</ul>
					<p className="mt-3 text-sm text-muted-foreground">
						User page {data.userPage} of{" "}
						{pageCount(data.userTotal, data.pageSize)} · {data.userTotal} users
					</p>
					<div className="mt-3 flex gap-2">
						<Button
							variant="outline"
							aria-label="Previous user page"
							disabled={pending || data.userPage <= 1}
							onClick={() => onPage("user", data.userPage - 1)}
						>
							Previous user page
						</Button>
						<Button
							variant="outline"
							aria-label="Next user page"
							disabled={
								pending || data.userPage * data.pageSize >= data.userTotal
							}
							onClick={() => onPage("user", data.userPage + 1)}
						>
							Next user page
						</Button>
					</div>
				</div>
			</div>
		</AdminPanel>
	);
}
