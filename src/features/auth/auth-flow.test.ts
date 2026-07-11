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

	test("rejects backslash and encoded separator redirect bypasses", () => {
		for (const target of [
			"/\\evil.example",
			"/\\\\evil.example",
			"///evil.example",
			"/%5cevil.example",
			"/%2f%2fevil.example",
		]) {
			expect(normalizeRedirectTarget(target)).toBe("/dashboard");
		}
	});

	test("preserves the path, search, and hash of a local target", () => {
		expect(normalizeRedirectTarget("/presets?p=1#saved")).toBe(
			"/presets?p=1#saved",
		);
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
