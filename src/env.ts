import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

import { BOOTSTRAP_ADMIN_EMAIL_DEFAULT } from "#/config/bootstrap-admin";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.string().url(),
		GOOGLE_CLIENT_ID: z.string().min(1),
		GOOGLE_CLIENT_SECRET: z.string().min(1),
		BOOTSTRAP_ADMIN_EMAIL: z
			.string()
			.email()
			.default(BOOTSTRAP_ADMIN_EMAIL_DEFAULT),
		SERVER_URL: z.string().url().optional(),
		GEMINI_API_KEY: z.string().min(1).optional(),
		GEMINI_MODEL: z
			.enum([
				"gemini-3.1-flash-lite",
				"gemini-2.5-flash-lite",
				"gemini-2.5-flash",
			])
			.default("gemini-3.1-flash-lite"),
	},

	/**
	 * The prefix that client-side variables must have. This is enforced both at
	 * a type-level and at runtime.
	 */
	clientPrefix: "VITE_",

	client: {
		VITE_APP_TITLE: z.string().min(1).optional(),
	},

	/**
	 * What object holds the environment variables at runtime. This is usually
	 * `process.env` or `import.meta.env`.
	 */
	runtimeEnv: { ...import.meta.env, ...process.env },

	/**
	 * By default, this library will feed the environment variables directly to
	 * the Zod validator.
	 *
	 * This means that if you have an empty string for a value that is supposed
	 * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
	 * it as a type mismatch violation. Additionally, if you have an empty string
	 * for a value that is supposed to be a string with a default value (e.g.
	 * `DOMAIN=` in an ".env" file), the default value will never be applied.
	 *
	 * In order to solve these issues, we recommend that all new projects
	 * explicitly specify this option as true.
	 */
	emptyStringAsUndefined: true,
});
