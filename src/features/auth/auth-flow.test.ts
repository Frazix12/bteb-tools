import { describe, expect, test } from "vitest";

import {
	getPostAuthDestination,
	normalizeRedirectTarget,
	submitCredentials,
} from "./auth-flow";

describe("normalizeRedirectTarget", () => {
	test("keeps an internal application path", () => {
		expect(normalizeRedirectTarget("/cover-page/new?from=dashboard")).toBe(
			"/cover-page/new?from=dashboard",
		);
	});

	test("rejects external and protocol-relative targets", () => {
		expect(normalizeRedirectTarget("https://example.com/steal")).toBe(
			"/dashboard",
		);
		expect(normalizeRedirectTarget("//example.com/steal")).toBe("/dashboard");
	});
});

describe("getPostAuthDestination", () => {
	test("redirects authenticated users to the requested internal page", () => {
		expect(getPostAuthDestination(true, "/index-sheet/new")).toBe(
			"/index-sheet/new",
		);
	});

	test("keeps anonymous users on the auth page", () => {
		expect(getPostAuthDestination(false, "/index-sheet/new")).toBeNull();
	});
});

describe("submitCredentials", () => {
	test("returns the provider error message", async () => {
		const result = await submitCredentials(
			() => Promise.resolve({ error: { message: "Invalid credentials" } }),
			{ email: "student@example.com", password: "incorrect" },
		);

		expect(result).toEqual({ ok: false, message: "Invalid credentials" });
	});

	test("returns success when the provider accepts credentials", async () => {
		const result = await submitCredentials(
			() => Promise.resolve({ error: null }),
			{ email: "student@example.com", password: "correct-password" },
		);

		expect(result).toEqual({ ok: true });
	});
});
