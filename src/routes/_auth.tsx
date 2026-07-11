import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "#/components/app-shell";
import { getCurrentSession } from "#/features/auth/current-session";

export const Route = createFileRoute("/_auth")({
	beforeLoad: async () => ({
		user: (await getCurrentSession())?.user ?? null,
	}),
	component: AppShell,
});
