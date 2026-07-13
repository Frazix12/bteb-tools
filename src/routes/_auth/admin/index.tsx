import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AdminOverview } from "#/features/admin/admin-overview";
import { AdminPageError, AdminPageLoading } from "#/features/admin/admin-page";
import {
	adminAiKeysOptions,
	adminSummaryOptions,
	adminUsageOptions,
} from "#/features/admin/admin-queries";

export const Route = createFileRoute("/_auth/admin/")({
	component: AdminOverviewRoute,
});

function AdminOverviewRoute() {
	const summary = useQuery(adminSummaryOptions());
	const usage = useQuery(adminUsageOptions(1, 1));
	const aiKeys = useQuery(adminAiKeysOptions());
	const queries = [summary, usage, aiKeys];
	if (queries.some((query) => query.isPending))
		return (
			<div className="page-wrap py-8 sm:py-10">
				<AdminPageLoading />
			</div>
		);
	if (
		queries.some((query) => query.isError) ||
		!summary.data ||
		!usage.data ||
		!aiKeys.data
	) {
		return (
			<div className="page-wrap py-8 sm:py-10">
				<AdminPageError
					onRetry={() =>
						void Promise.all(queries.map((query) => query.refetch()))
					}
				/>
			</div>
		);
	}
	return (
		<div className="page-wrap py-8 sm:py-10">
			<AdminOverview
				summary={summary.data}
				usage={usage.data}
				aiKeys={aiKeys.data}
			/>
		</div>
	);
}
