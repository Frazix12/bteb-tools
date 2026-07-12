import { redirect } from "@tanstack/react-router";

import { getCurrentSession } from "./current-session";

export async function requireSession(locationHref: string) {
	const session = await getCurrentSession();
	if (!session) {
		throw redirect({
			to: "/login",
			search: { redirect: locationHref },
		});
	}
	return { user: session.user };
}
