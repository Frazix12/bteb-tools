import { describe, expect, test } from "vitest";

import {
	BOOTSTRAP_ADMIN_EMAIL_DEFAULT,
	getBootstrapAdminEmail,
} from "./bootstrap-admin";

describe("bootstrap admin config", () => {
	test("uses the shared default when no override is configured", () => {
		expect(getBootstrapAdminEmail({})).toBe(BOOTSTRAP_ADMIN_EMAIL_DEFAULT);
	});

	test("normalizes a configured override", () => {
		expect(
			getBootstrapAdminEmail({
				BOOTSTRAP_ADMIN_EMAIL: "  Admin@Example.COM  ",
			}),
		).toBe("admin@example.com");
	});

	test.each([
		"",
		"   ",
	])("uses the shared default for an empty override %#", (override) => {
		expect(getBootstrapAdminEmail({ BOOTSTRAP_ADMIN_EMAIL: override })).toBe(
			BOOTSTRAP_ADMIN_EMAIL_DEFAULT,
		);
	});
});
