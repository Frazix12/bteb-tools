import { ChartNoAxesCombined } from "lucide-react";
import type { Usage } from "./types";
export function UsagePanel({ data }: { data: Usage }) {
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
				<dd>{t.inputTokens}</dd>
				<dt>Output tokens</dt>
				<dd>{t.outputTokens}</dd>
				<dt>Estimated cost</dt>
				<dd>${(Number(t.costMicros || 0) / 1_000_000).toFixed(4)}</dd>
			</dl>
			<h3 className="font-semibold">By date</h3>
			<ul>
				{data.byDate.map((x) => (
					<li key={x.date}>
						{x.date}: {x.events} requests · $
						{(Number(x.costMicros || 0) / 1_000_000).toFixed(4)}
					</li>
				))}
			</ul>
			<h3 className="font-semibold">By user</h3>
			<ul>
				{data.byUser.map((x) => (
					<li key={x.ownerId}>
						{x.name || x.email}: {x.events} requests · $
						{(Number(x.costMicros || 0) / 1_000_000).toFixed(4)}
					</li>
				))}
			</ul>
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
