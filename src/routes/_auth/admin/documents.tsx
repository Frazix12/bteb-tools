import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
	AdminMessage,
	AdminPageError,
	AdminPageHeader,
	AdminPageLoading,
} from "#/features/admin/admin-page";
import {
	adminDocumentsOptions,
	adminSummaryOptions,
	invalidateAdminDocuments,
	invalidateAdminSummary,
} from "#/features/admin/admin-queries";
import { DataPanel } from "#/features/admin/data-panel";
import { useAdminMutation } from "#/features/admin/use-admin-mutation";
import { orpc } from "#/orpc/client";

export const Route = createFileRoute("/_auth/admin/documents")({
	component: DocumentsRoute,
});
function DocumentsRoute() {
	const [page, setPage] = useState(1);
	const summary = useQuery(adminSummaryOptions());
	const documents = useQuery(adminDocumentsOptions(page));
	const action = useAdminMutation({
		mutationFn: (input: { id: string }) =>
			orpc.admin.data.deleteDocument.call(input),
		invalidate: async (client) => {
			await Promise.all([
				invalidateAdminDocuments(client),
				invalidateAdminSummary(client),
			]);
		},
		successMessage: "Document deleted.",
	});
	const queries = [summary, documents];
	return (
		<div className="page-wrap grid gap-6 py-8 sm:py-10">
			<AdminPageHeader
				title="Documents"
				description="Inspect stored documents and remove them when necessary."
			/>
			{action.message && <AdminMessage message={action.message} />}
			{queries.some((q) => q.isPending) ? (
				<AdminPageLoading />
			) : queries.some((q) => q.isError) || !summary.data || !documents.data ? (
				<AdminPageError
					onRetry={() => void Promise.all(queries.map((q) => q.refetch()))}
				/>
			) : (
				<DataPanel
					summary={summary.data}
					data={documents.data}
					pending={action.isPending}
					onDelete={(id) => action.mutate({ id })}
					onPage={(_, next) => setPage(next)}
				/>
			)}
		</div>
	);
}
