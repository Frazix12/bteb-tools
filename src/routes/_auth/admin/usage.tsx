import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "#/features/admin/admin-placeholder";

export const Route = createFileRoute("/_auth/admin/usage")({
	component: () => <AdminPlaceholder title="Usage" />,
});
