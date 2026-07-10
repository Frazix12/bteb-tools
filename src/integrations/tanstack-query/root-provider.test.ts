import { afterEach, describe, expect, test, vi } from "vitest";

import { getContext } from "./root-provider";

describe("QueryClient lifetime", () => {
	afterEach(() => vi.unstubAllGlobals());

	test("creates a fresh client for each server request context", () => {
		vi.stubGlobal("window", undefined);
		expect(getContext().queryClient).not.toBe(getContext().queryClient);
	});

	test("reuses one client in the browser", () => {
		vi.stubGlobal("window", {});
		expect(getContext().queryClient).toBe(getContext().queryClient);
	});
});
