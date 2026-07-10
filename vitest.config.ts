import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["src/**/*.test.{ts,tsx}"],
	},
	resolve: {
		alias: {
		"#": fileURLToPath(new URL("./src", import.meta.url)),
		"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
});
