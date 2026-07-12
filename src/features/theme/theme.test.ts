import { describe, expect, test } from "vitest";
import { readThemeMode, resolveTheme } from "./theme";

describe("theme", () => {
	test.each(["light", "dark", "system"] as const)("accepts %s", (mode) => {
		expect(readThemeMode(mode)).toBe(mode);
	});

	test.each([null, "", "auto", "sepia"])("defaults %s to system", (value) => {
		expect(readThemeMode(value)).toBe("system");
	});

	test("resolves system preference", () => {
		expect(resolveTheme("system", true)).toBe("dark");
		expect(resolveTheme("system", false)).toBe("light");
		expect(resolveTheme("light", true)).toBe("light");
	});
});
