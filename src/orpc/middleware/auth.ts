import { ORPCError } from "@orpc/server";

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
