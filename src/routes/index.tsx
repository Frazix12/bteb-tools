import { createFileRoute, redirect } from "@tanstack/react-router";

import { getCurrentSession } from "#/features/auth/current-session";

export const Route = createFileRoute("/")({
	beforeLoad: async () => {
		throw redirect({
			to: (await getCurrentSession()) ? "/dashboard" : "/login",
		});
	},
});
