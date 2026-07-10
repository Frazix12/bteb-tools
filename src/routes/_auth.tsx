import { createFileRoute, redirect } from "@tanstack/react-router";

import { AppShell } from "#/components/app-shell";
import { getCurrentSession } from "#/features/auth/current-session";

export const Route = createFileRoute("/_auth")({
	beforeLoad: async ({ location }) => {
		const session = await getCurrentSession();
		if (!session) {
			throw redirect({
				to: "/login",
				search: { redirect: location.href },
			});
		}
		return { user: session.user };
	},
	component: AppShell,
});
