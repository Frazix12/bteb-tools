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
		</section>
	);
}
