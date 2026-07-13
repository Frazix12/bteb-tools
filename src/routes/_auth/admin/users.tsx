import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { useState } from "react";
import {
	AdminMessage,
	AdminPageError,
	AdminPageHeader,
	AdminPageLoading,
} from "#/features/admin/admin-page";
import {
	adminUsersOptions,
	invalidateAdminSummary,
	invalidateAdminUsers,
} from "#/features/admin/admin-queries";
import { getAdminBootstrapEmail } from "#/features/admin/bootstrap-admin-email";
import { useAdminMutation } from "#/features/admin/use-admin-mutation";
import { UsersPanel } from "#/features/admin/users-panel";
import { orpc } from "#/orpc/client";

export const Route = createFileRoute("/_auth/admin/users")({
	loader: usersLoader,
	component: UsersRoute,
});

export async function usersLoader() {
	return { bootstrapEmail: await getAdminBootstrapEmail() };
}

function UsersRoute() {
	const { bootstrapEmail } = useLoaderData({ from: "/_auth/admin/users" });
	const [page, setPage] = useState(1);
	const query = useQuery(adminUsersOptions(page));
	const action = useAdminMutation({
		mutationFn: (input: { userId: string; role: "user" | "admin" }) =>
			orpc.admin.users.setRole.call(input),
		invalidate: async (client) => {
			await Promise.all([
				invalidateAdminUsers(client),
				invalidateAdminSummary(client),
			]);
		},
		successMessage: "User role updated.",
	});
	return (
		<div className="page-wrap grid gap-6 py-8 sm:py-10">
			<AdminPageHeader
				title="Users"
				description="Manage workspace accounts and administrative access."
			/>
			{action.message && <AdminMessage message={action.message} />}
			{query.isPending ? (
				<AdminPageLoading />
			) : query.isError || !query.data ? (
				<AdminPageError onRetry={() => void query.refetch()} />
			) : (
				<UsersPanel
					data={query.data}
					pending={action.isPending}
					bootstrapEmail={bootstrapEmail}
					onPage={(_, next) => setPage(next)}
					onRole={(target, role) => action.mutate({ userId: target.id, role })}
				/>
			)}
		</div>
	);
}
