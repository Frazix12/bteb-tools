import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { serializeSignedCookie } from "better-call";
import pg from "pg";
import { AUTH_FIXTURE } from "./auth-fixture";
import { DATABASE_URL } from "./test-database";

const databaseUrl = DATABASE_URL;
const secret = process.env.BETTER_AUTH_SECRET;
if (!databaseUrl) throw new Error("DATABASE_URL is required for Playwright setup");
if (!secret || secret.length < 32)
	throw new Error("BETTER_AUTH_SECRET (at least 32 characters) is required for Playwright setup");
const authSecret = secret;

export default async function globalSetup() {
	const pool = new pg.Pool({ connectionString: databaseUrl });
	const requiredColumns = {
		user: ["id", "email", "role"],
		session: ["id", "token", "user_id", "expires_at"],
		document: ["id", "owner_id", "type", "title", "data"],
		preset: ["slug", "title", "type", "data", "enabled"],
	} as const;
	const result = await pool.query<{ table_name: string; column_name: string }>(
		"select table_name, column_name from information_schema.columns where table_schema = 'public' and table_name = any($1::text[])",
		[Object.keys(requiredColumns)],
	);
	const available = new Set(
		result.rows.map((row) => `${row.table_name}.${row.column_name}`),
	);
	const missing = Object.entries(requiredColumns).flatMap(([table, columns]) =>
		columns.filter((column) => !available.has(`${table}.${column}`)).map((column) => `${table}.${column}`),
	);
	if (missing.length) {
		await pool.end();
		throw new Error(`Playwright database is not migrated; missing public columns: ${missing.join(", ")}`);
	}
	process.env.DATABASE_URL = databaseUrl;
	execFileSync("pnpm", ["db:seed"], { stdio: "inherit", env: process.env });

	try {
		await pool.query('delete from "user" where email like $1', [
			`%${AUTH_FIXTURE.emailSuffix}`,
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
			if (fixture.role === "user") {
				await pool.query(
					'insert into "document" (owner_id, type, title, data) values ($1, $2, $3, $4::jsonb)',
					[userId, "index_sheet", "Playwright fixture document", JSON.stringify({ fixture: true })],
				);
			}
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
