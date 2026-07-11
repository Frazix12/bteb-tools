import { ChartNoAxesCombined } from "lucide-react";
import { Button } from "#/components/ui/button";
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
		<section aria-labelledby="usage-title">
			<h2 id="usage-title" className="flex gap-2 text-xl font-semibold">
				<ChartNoAxesCombined aria-hidden="true" />
				AI Usage
			</h2>
			<dl>
				<dt>Requests</dt>
				<dd>{t.events}</dd>
				<dt>Input tokens</dt>
				<dd>{tokens(t.inputTokens)}</dd>
				<dt>Output tokens</dt>
				<dd>{tokens(t.outputTokens)}</dd>
				<dt>Estimated cost</dt>
				<dd>${(Number(t.costMicros || 0) / 1_000_000).toFixed(4)}</dd>
			</dl>
			<h3 className="font-semibold">By model</h3>
			<ul>
				{data.byModel.map((x) => (
					<li key={`${x.provider}:${x.model}`}>
						{x.provider} / {x.model}: {x.events} requests ·{" "}
						{tokens(x.inputTokens)} input / {tokens(x.outputTokens)} output · $
						{(Number(x.costMicros || 0) / 1_000_000).toFixed(4)}
					</li>
				))}
			</ul>
			<h3 className="font-semibold">By date</h3>
			<ul>
				{data.byDate.map((x) => (
					<li key={x.date}>
						{x.date}: {x.events} requests · {tokens(x.inputTokens)} input /{" "}
						{tokens(x.outputTokens)} output · $
						{(Number(x.costMicros || 0) / 1_000_000).toFixed(4)}
					</li>
				))}
			</ul>
			<p>
				Date page {data.datePage} of {pageCount(data.dateTotal, data.pageSize)}{" "}
				· {data.dateTotal} dates
			</p>
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
				disabled={pending || data.datePage * data.pageSize >= data.dateTotal}
				onClick={() => onPage("date", data.datePage + 1)}
			>
				Next date page
			</Button>
			<h3 className="font-semibold">By user</h3>
			<ul>
				{data.byUser.map((x) => (
					<li key={x.ownerId}>
						{x.name || x.email}: {x.events} requests · {tokens(x.inputTokens)}{" "}
						input / {tokens(x.outputTokens)} output · $
						{(Number(x.costMicros || 0) / 1_000_000).toFixed(4)}
					</li>
				))}
			</ul>
			<p>
				User page {data.userPage} of {pageCount(data.userTotal, data.pageSize)}{" "}
				· {data.userTotal} users
			</p>
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
				disabled={pending || data.userPage * data.pageSize >= data.userTotal}
				onClick={() => onPage("user", data.userPage + 1)}
			>
				Next user page
			</Button>
			<h3 className="font-semibold">By outcome</h3>
			<ul>
				{data.byOutcome.map((x) => (
					<li key={x.outcome}>
						{x.outcome}: {x.events} requests · $
						{(Number(x.costMicros || 0) / 1_000_000).toFixed(4)}
					</li>
				))}
			</ul>
		</section>
	);
}
