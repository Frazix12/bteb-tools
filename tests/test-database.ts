import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for Playwright");
export const DATABASE_URL = databaseUrl;
