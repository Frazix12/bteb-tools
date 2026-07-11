import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";

import { db } from "#/db";
import * as schema from "#/db/schema";
import { env } from "#/env";
import {
	getSessionUserUpdate,
	normalizeCreatedAuthUser,
} from "./auth-normalization";

export const auth = betterAuth({
	baseURL: env.BETTER_AUTH_URL,
	database: drizzleAdapter(db, {
		provider: "pg",
		schema,
	}),
	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
		},
	},
	user: {
		additionalFields: {
			role: { type: "string", defaultValue: "user", input: false },
		},
	},
	databaseHooks: {
		user: {
			create: {
				before: async (user) => ({
					data: normalizeCreatedAuthUser(user, env.BOOTSTRAP_ADMIN_EMAIL),
				}),
			},
		},
		session: {
			create: {
				before: async (session) => {
					const [account] = await db
						.select({ email: schema.user.email, role: schema.user.role })
						.from(schema.user)
						.where(eq(schema.user.id, session.userId))
						.limit(1);
					const update = account
						? getSessionUserUpdate(account, env.BOOTSTRAP_ADMIN_EMAIL)
						: null;
					if (update) {
						await db
							.update(schema.user)
							.set(update)
							.where(eq(schema.user.id, session.userId));
					}
					return { data: session };
				},
			},
		},
	},
	plugins: [tanstackStartCookies()],
	secret: env.BETTER_AUTH_SECRET,
});
