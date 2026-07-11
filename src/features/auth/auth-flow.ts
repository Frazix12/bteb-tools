import { authClient } from "#/lib/auth-client";

export function normalizeRedirectTarget(target?: string) {
	if (!target?.startsWith("/")) {
		return "/dashboard";
	}

	try {
		const localOrigin = "https://local.invalid";
		const parsed = new URL(target, localOrigin);
		const decodedPath = decodeURIComponent(parsed.pathname);

		if (
			parsed.origin !== localOrigin ||
			decodedPath.startsWith("//") ||
			decodedPath.includes("\\")
		) {
			return "/dashboard";
		}

		return `${parsed.pathname}${parsed.search}${parsed.hash}`;
	} catch {
		return "/dashboard";
	}
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
