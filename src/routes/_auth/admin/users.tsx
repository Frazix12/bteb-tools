import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "#/features/admin/admin-placeholder";

export const Route = createFileRoute("/_auth/admin/users")({
	component: () => <AdminPlaceholder title="Users" />,
});
