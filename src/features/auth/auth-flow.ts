import { authClient } from "#/lib/auth-client";

export function normalizeRedirectTarget(target?: string) {
	if (!target?.startsWith("/") || target.startsWith("//")) {
		return "/dashboard";
	}

	return target;
}

export function getPostAuthDestination(
	isAuthenticated: boolean,
	redirect?: string,
) {
	return isAuthenticated ? normalizeRedirectTarget(redirect) : null;
}

export function startGoogleSignIn(redirect?: string) {
	return authClient.signIn.social({
		provider: "google",
		callbackURL: normalizeRedirectTarget(redirect),
	});
}
