import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { normalizeRedirectTarget } from "#/features/auth/auth-flow";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/signup")({
	beforeLoad: async ({ search }) => {
		throw redirect({
			to: "/login",
			search: search.redirect
				? { redirect: normalizeRedirectTarget(search.redirect) }
				: {},
		});
	},
	validateSearch: searchSchema,
});
