import { describe, expect, test, vi } from "vitest";

import { readLogo } from "./read-logo";

const file = (type: string, size: number) => ({ type, size }) as File;

describe("readLogo", () => {
	test("returns a data URL for a supported image", async () => {
		const read = vi.fn(() => Promise.resolve("data:image/png;base64,aGVsbG8="));
		await expect(readLogo(file("image/png", 512), read)).resolves.toBe(
			"data:image/png;base64,aGVsbG8=",
		);
	});

	test("rejects unsupported and oversized files before reading", async () => {
		const read = vi.fn(() => Promise.resolve("unused"));
		await expect(readLogo(file("image/svg+xml", 10), read)).rejects.toThrow(
			"PNG, JPEG, or WebP",
		);
		await expect(readLogo(file("image/png", 1_048_577), read)).rejects.toThrow(
			"1 MiB",
		);
		expect(read).not.toHaveBeenCalled();
	});
});
