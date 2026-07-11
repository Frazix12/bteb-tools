import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests",
	fullyParallel: true,
	use: {
		baseURL: "http://127.0.0.1:3100",
		...devices["Desktop Chrome"],
	},
	webServer: {
		command:
			"DATABASE_URL=${DATABASE_URL:-postgresql://fixture:fixture@127.0.0.1:5432/fixture} BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET:-visual-fixture-secret-at-least-32-characters} BETTER_AUTH_URL=http://127.0.0.1:3100 GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-playwright-google-client} GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET:-playwright-google-secret} BOOTSTRAP_ADMIN_EMAIL=frazixgaming22@gmail.com bun x vite dev --host 127.0.0.1 --port 3100",
		url: "http://127.0.0.1:3100/visual-fixtures",
		reuseExistingServer: true,
	},
});
