import { describe, expect, test } from "vitest";

import { getPostAuthDestination, normalizeRedirectTarget } from "./auth-flow";

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
