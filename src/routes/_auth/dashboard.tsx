import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { requireSession } from "#/features/auth/require-session";
import { DashboardView } from "#/features/dashboard/dashboard-view";
import {
	documentListOptions,
	duplicateDocumentMutationOptions,
	removeDocumentMutationOptions,
} from "#/features/documents/queries";

export const Route = createFileRoute("/_auth/dashboard")({
	beforeLoad: ({ location }) => requireSession(location.href),
	component: Dashboard,
});

function errorMessage(error: unknown, fallback: string) {
	return error instanceof Error && error.message ? error.message : fallback;
}

function Dashboard() {
	const queryClient = useQueryClient();
	const documentsQuery = useQuery(documentListOptions());
	const duplicate = useMutation(duplicateDocumentMutationOptions(queryClient));
	const remove = useMutation(removeDocumentMutationOptions(queryClient));
	const actionError = duplicate.error ?? remove.error;

	return (
		<DashboardView
			actionError={
				actionError
					? errorMessage(actionError, "The document action failed.")
					: null
			}
			documents={documentsQuery.data ?? []}
			error={
				documentsQuery.error
					? errorMessage(documentsQuery.error, "Documents could not be loaded.")
					: null
			}
			isLoading={documentsQuery.isLoading}
			onDelete={(id) => {
				remove.mutate({ id });
			}}
			onDuplicate={(id) => duplicate.mutate({ id })}
			onRetry={() => void documentsQuery.refetch()}
			pendingDeleteId={remove.isPending ? (remove.variables?.id ?? null) : null}
			pendingDuplicateId={
				duplicate.isPending ? (duplicate.variables?.id ?? null) : null
			}
		/>
	);
}
