import { ORPCError } from "@orpc/server";

import { assertAdminUser } from "#/features/admin/authorization";
import { getSession } from "#/lib/session";
import { publicProcedure } from "#/orpc/context";

export const authMiddleware = publicProcedure.middleware(
	async ({ context, next }) => {
		const session = await getSession(context.headers);
		if (!session) throw new ORPCError("UNAUTHORIZED");
		return next({ context: { session, user: session.user } });
	},
);

export const protectedProcedure = publicProcedure.use(authMiddleware);

export const adminMiddleware = authMiddleware.concat(
	async ({ context, next }) => {
		assertAdminUser(context.user);
		return next();
	},
);

export const adminProcedure = publicProcedure.use(adminMiddleware);
