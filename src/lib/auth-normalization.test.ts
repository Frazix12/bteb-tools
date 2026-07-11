import { describe, expect, test } from "vitest";
import {
	getSessionUserUpdate,
	normalizeCreatedAuthUser,
} from "./auth-normalization";

describe("auth user normalization", () => {
	test("persists a trimmed lowercase Google email and promotes the bootstrap account", () => {
		expect(
			normalizeCreatedAuthUser(
				{ email: "  FRAZIXGAMING22@GMAIL.COM  ", name: "Owner" },
				"frazixgaming22@gmail.com",
			),
		).toEqual({
			email: "frazixgaming22@gmail.com",
			name: "Owner",
			role: "admin",
		});
	});

	test("normalizes an existing user's email once without changing their role", () => {
		expect(
			getSessionUserUpdate(
				{ email: " Student@Example.COM ", role: "user" },
				"frazixgaming22@gmail.com",
			),
		).toEqual({ email: "student@example.com" });
		expect(
			getSessionUserUpdate(
				{ email: "student@example.com", role: "user" },
				"frazixgaming22@gmail.com",
			),
		).toBeNull();
	});

	test("normalizes and promotes an existing mixed-case bootstrap account together", () => {
		expect(
			getSessionUserUpdate(
				{ email: " FRAZIXGAMING22@GMAIL.COM ", role: "user" },
				"frazixgaming22@gmail.com",
			),
		).toEqual({ email: "frazixgaming22@gmail.com", role: "admin" });
	});
});
