type Credentials = {
	email: string;
	password: string;
	name?: string;
};

type AuthResult = {
	error: { message?: string } | null;
};

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

export async function submitCredentials(
	submit: (credentials: Credentials) => Promise<AuthResult>,
	credentials: Credentials,
) {
	const result = await submit(credentials);

	if (result.error) {
		return {
			ok: false as const,
			message: result.error.message ?? "Authentication failed",
		};
	}

	return { ok: true as const };
}
