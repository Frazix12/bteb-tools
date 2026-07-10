import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { getPostAuthDestination } from "#/features/auth/auth-flow";
import { AuthPage } from "#/features/auth/auth-page";
import { getCurrentSession } from "#/features/auth/current-session";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/login")({
	beforeLoad: async ({ search }) => {
		const destination = getPostAuthDestination(
			Boolean(await getCurrentSession()),
			search.redirect,
		);
		if (destination) {
			throw redirect({ to: destination });
		}
	},
	component: LoginPage,
	validateSearch: searchSchema,
});

function LoginPage() {
	const { redirect: redirectTarget } = Route.useSearch();
	return <AuthPage mode="login" redirect={redirectTarget} />;
}
