import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
	AdminPageError,
	AdminPageHeader,
	AdminPageLoading,
} from "#/features/admin/admin-page";
import { adminUsageOptions } from "#/features/admin/admin-queries";
import { UsagePanel } from "#/features/admin/usage-panel";

export const Route = createFileRoute("/_auth/admin/usage")({
	component: UsageRoute,
});
function UsageRoute() {
	const [pages, setPages] = useState({ date: 1, user: 1 });
	const query = useQuery(adminUsageOptions(pages.date, pages.user));
	return (
		<div className="page-wrap grid gap-6 py-8 sm:py-10">
			<AdminPageHeader
				title="Usage"
				description="Monitor AI requests, tokens, outcomes, and estimated costs."
			/>
			{query.isPending ? (
				<AdminPageLoading />
			) : query.isError || !query.data ? (
				<AdminPageError onRetry={() => void query.refetch()} />
			) : (
				<UsagePanel
					data={query.data}
					pending={false}
					onPage={(kind, page) =>
						setPages((current) => ({ ...current, [kind]: page }))
					}
				/>
			)}
		</div>
	);
}
