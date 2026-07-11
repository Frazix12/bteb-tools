import { z } from "zod";

import { BOOTSTRAP_ADMIN_EMAIL_DEFAULT } from "#/config/bootstrap-admin";

export const serverEnvSchema = {
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
	AI_KEY_ENCRYPTION_SECRET: z.string().min(32).optional(),
	GEMINI_MODEL: z
		.enum([
			"gemini-3.1-flash-lite",
			"gemini-2.5-flash-lite",
			"gemini-2.5-flash",
		])
		.default("gemini-3.1-flash-lite"),
};
