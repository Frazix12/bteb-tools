import { os } from "@orpc/server";

export interface ORPCContext {
	headers: Headers;
}

export const publicProcedure = os.$context<ORPCContext>();
