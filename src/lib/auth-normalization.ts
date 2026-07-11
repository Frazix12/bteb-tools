type AuthUser = { email: string; role?: string; [key: string]: unknown };

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function normalizeCreatedAuthUser<T extends AuthUser>(
	user: T,
	bootstrapEmail: string,
) {
	const email = normalizeEmail(user.email);
	return {
		...user,
		email,
		role: email === normalizeEmail(bootstrapEmail) ? "admin" : "user",
	};
}

export function getSessionUserUpdate(
	user: Pick<AuthUser, "email" | "role">,
	bootstrapEmail: string,
): { email?: string; role?: "admin" } | null {
	const email = normalizeEmail(user.email);
	const update: { email?: string; role?: "admin" } = {};
	if (email !== user.email) update.email = email;
	if (email === normalizeEmail(bootstrapEmail) && user.role !== "admin")
		update.role = "admin";
	return Object.keys(update).length ? update : null;
}
