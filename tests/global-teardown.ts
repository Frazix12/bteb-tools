import pg from "pg";
import { ROOT_DATABASE_URL, TEST_SCHEMA } from "./test-database";

export default async function globalTeardown() {
	const pool = new pg.Pool({ connectionString: ROOT_DATABASE_URL });
	try {
		await pool.query(`drop schema if exists ${TEST_SCHEMA} cascade`);
	} finally {
		await pool.end();
	}
}
