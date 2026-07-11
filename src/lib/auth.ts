import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";

import { db } from "#/db";
import * as schema from "#/db/schema";
import { env } from "#/env";

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
					data: {
						...user,
						role:
							user.email.trim().toLowerCase() ===
							env.BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase()
								? "admin"
								: "user",
					},
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
					if (
						account?.role !== "admin" &&
						account?.email.trim().toLowerCase() ===
							env.BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase()
					) {
						await db
							.update(schema.user)
							.set({ role: "admin" })
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
