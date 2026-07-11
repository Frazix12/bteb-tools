import pg from "pg";
import { AUTH_FIXTURE } from "./auth-fixture";
import { DATABASE_URL } from "./test-database";

export default async function globalTeardown() {
	const pool = new pg.Pool({ connectionString: DATABASE_URL });
	try {
		await pool.query('delete from "user" where email like $1', [
			`%${AUTH_FIXTURE.emailSuffix}`,
		]);
	} finally {
		await pool.end();
	}
}
