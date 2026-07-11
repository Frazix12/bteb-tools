import { ORPCError } from "@orpc/server";

type RoleHolder = { role?: string | null };

const bootstrapAdminEmail =
	process.env.BOOTSTRAP_ADMIN_EMAIL ?? "frazixgaming22@gmail.com";

export function assertAdminUser(user: RoleHolder): void {
	if (user.role !== "admin") {
		throw new ORPCError("FORBIDDEN", { message: "FORBIDDEN" });
	}
}

export function isBootstrapAdminEmail(email: string): boolean {
	return (
		email.trim().toLowerCase() === bootstrapAdminEmail.trim().toLowerCase()
	);
}

export function canChangeRole(input: {
	actorId: string;
	targetId: string;
	targetEmail: string;
}): boolean {
	return !(
		input.actorId === input.targetId && isBootstrapAdminEmail(input.targetEmail)
	);
}
