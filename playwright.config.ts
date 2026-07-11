import { defineConfig, devices } from "@playwright/test";
import { TEST_DATABASE_URL } from "./tests/test-database";

export default defineConfig({
	testDir: "./tests",
	globalSetup: "./tests/global-setup.ts",
	globalTeardown: "./tests/global-teardown.ts",
	fullyParallel: true,
	use: {
		baseURL: "http://127.0.0.1:3100",
		...devices["Desktop Chrome"],
	},
	webServer: {
		command:
			"BETTER_AUTH_URL=http://127.0.0.1:3100 GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-playwright-google-client} GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET:-playwright-google-secret} BOOTSTRAP_ADMIN_EMAIL=frazixgaming22@gmail.com bun x vite dev --host 127.0.0.1 --port 3100",
		url: "http://127.0.0.1:3100/visual-fixtures",
		env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
		reuseExistingServer: false,
	},
});
