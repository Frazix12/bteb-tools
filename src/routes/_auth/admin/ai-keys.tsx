import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "#/features/admin/admin-placeholder";

export const Route = createFileRoute("/_auth/admin/ai-keys")({
	component: () => <AdminPlaceholder title="AI keys" />,
});
