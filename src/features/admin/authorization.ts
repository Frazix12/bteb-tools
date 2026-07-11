import { ORPCError } from "@orpc/server";

import { getBootstrapAdminEmail } from "#/config/bootstrap-admin";

type RoleHolder = { role?: string | null };

export function assertAdminUser(user: RoleHolder): void {
	if (user.role !== "admin") {
		throw new ORPCError("FORBIDDEN", { message: "FORBIDDEN" });
	}
}

export function isBootstrapAdminEmail(email: string): boolean {
	return email.trim().toLowerCase() === getBootstrapAdminEmail();
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
