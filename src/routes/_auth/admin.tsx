import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminShell } from "#/features/admin/admin-shell";
import { requireSession } from "#/features/auth/require-session";

export const Route = createFileRoute("/_auth/admin")({
	beforeLoad: async ({ location }) => {
		const { user } = await requireSession(location.href);
		if (user.role !== "admin") throw redirect({ to: "/dashboard" });
		return { user };
	},
	component: AdminShell,
});
