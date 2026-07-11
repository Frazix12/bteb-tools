import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { serializeSignedCookie } from "better-call";
import pg from "pg";
import { AUTH_FIXTURE } from "./auth-fixture";
import { ROOT_DATABASE_URL, TEST_DATABASE_URL, TEST_SCHEMA } from "./test-database";

const databaseUrl = TEST_DATABASE_URL;
const secret = process.env.BETTER_AUTH_SECRET;
if (!databaseUrl) throw new Error("DATABASE_URL is required for Playwright setup");
if (!secret || secret.length < 32)
	throw new Error("BETTER_AUTH_SECRET (at least 32 characters) is required for Playwright setup");
const authSecret = secret;

export default async function globalSetup() {
	const root = new pg.Pool({ connectionString: ROOT_DATABASE_URL });
	try {
		await root.query(`drop schema if exists ${TEST_SCHEMA} cascade`);
		await root.query(`create schema ${TEST_SCHEMA}`);
	} finally {
		await root.end();
	}
	process.env.DATABASE_URL = TEST_DATABASE_URL;
	execFileSync("pnpm", ["db:migrate"], { stdio: "inherit", env: process.env });
	execFileSync("pnpm", ["db:seed"], { stdio: "inherit", env: process.env });

	const pool = new pg.Pool({ connectionString: databaseUrl });
	try {
		await pool.query('delete from "user" where email = any($1::text[])', [
			[AUTH_FIXTURE.userEmail, AUTH_FIXTURE.adminEmail],
		]);
		await mkdir("test-results/auth", { recursive: true });
		for (const fixture of [
			{ email: AUTH_FIXTURE.userEmail, role: "user", path: AUTH_FIXTURE.userState },
			{ email: AUTH_FIXTURE.adminEmail, role: "admin", path: AUTH_FIXTURE.adminState },
		] as const) {
			const userId = `playwright-${fixture.role}-${randomUUID()}`;
			const token = randomBytes(24).toString("hex");
			await pool.query(
				'insert into "user" (id, name, email, email_verified, role, created_at, updated_at) values ($1, $2, $3, true, $4, now(), now())',
				[userId, `Playwright ${fixture.role}`, fixture.email, fixture.role],
			);
			await pool.query(
				'insert into "session" (id, expires_at, token, created_at, updated_at, user_id) values ($1, now() + interval \'1 hour\', $2, now(), now(), $3)',
				[randomUUID(), token, userId],
			);
			const serialized = await serializeSignedCookie(
				"better-auth.session_token",
				token,
				authSecret,
				{ httpOnly: true, path: "/", sameSite: "lax" },
			);
			const value = serialized.slice(serialized.indexOf("=") + 1, serialized.indexOf(";"));
			await writeFile(
				fixture.path,
				JSON.stringify({
					cookies: [
						{
							name: "better-auth.session_token",
							value,
							domain: "127.0.0.1",
							path: "/",
							httpOnly: true,
							secure: false,
							sameSite: "Lax",
						},
					],
					origins: [],
				}),
			);
		}
	} finally {
		await pool.end();
	}
}
