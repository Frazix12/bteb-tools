import { describe, expect, test } from "vitest";

import {
	assertAdminUser,
	canChangeRole,
	isBootstrapAdminEmail,
} from "./authorization";

const bootstrapAdminEmail =
	process.env.BOOTSTRAP_ADMIN_EMAIL ?? "frazixgaming22@gmail.com";

describe("admin authorization", () => {
	test("denies ordinary users and accepts admins", () => {
		expect(() => assertAdminUser({ role: "user" })).toThrow("FORBIDDEN");
		expect(() => assertAdminUser({ role: "admin" })).not.toThrow();
	});

	test("recognizes the bootstrap admin email without case or surrounding whitespace", () => {
		expect(
			isBootstrapAdminEmail(`  ${bootstrapAdminEmail.toUpperCase()}  `),
		).toBe(true);
		expect(isBootstrapAdminEmail("someone@example.com")).toBe(false);
	});

	test("prevents changing the bootstrap admin's own role", () => {
		expect(
			canChangeRole({
				actorId: "a",
				targetId: "a",
				targetEmail: bootstrapAdminEmail,
			}),
		).toBe(false);
	});
});
