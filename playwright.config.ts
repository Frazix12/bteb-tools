import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/visual",
	fullyParallel: true,
	use: {
		baseURL: "http://127.0.0.1:3000",
		...devices["Desktop Chrome"],
	},
	webServer: {
		command:
			"DATABASE_URL=postgresql://fixture:fixture@127.0.0.1:5432/fixture BETTER_AUTH_SECRET=visual-fixture-secret-at-least-32-characters BETTER_AUTH_URL=http://127.0.0.1:3000 bun x vite dev --host 127.0.0.1 --port 3000",
		url: "http://127.0.0.1:3000/visual-fixtures",
		reuseExistingServer: true,
	},
});
