import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

export const TEST_SCHEMA = "playwright_e2e";
export const ROOT_DATABASE_URL = process.env.DATABASE_URL;
if (!ROOT_DATABASE_URL) throw new Error("DATABASE_URL is required for Playwright");

const url = new URL(ROOT_DATABASE_URL);
url.searchParams.set("options", `-c search_path=${TEST_SCHEMA}`);
export const TEST_DATABASE_URL = url.toString();
