import { describe, expect, test } from "vitest";

import { getBootstrapAdminEmail } from "#/config/bootstrap-admin";

import {
	assertAdminUser,
	canChangeRole,
	isBootstrapAdminEmail,
} from "./authorization";

const bootstrapAdminEmail = getBootstrapAdminEmail();

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

	test("prevents every actor from changing the bootstrap admin's role", () => {
		expect(
			canChangeRole({
				actorId: "a",
				targetId: "a",
				targetEmail: bootstrapAdminEmail,
			}),
		).toBe(false);
		expect(
			canChangeRole({
				actorId: "other-admin",
				targetId: "a",
				targetEmail: bootstrapAdminEmail,
			}),
		).toBe(false);
	});
});
