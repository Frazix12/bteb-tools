import { describe, expect, test } from "vitest";

import { formatIndexDate } from "./format-date";

describe("formatIndexDate", () => {
	test("formats an ISO date without timezone conversion", () => {
		expect(formatIndexDate("2026-07-01")).toBe("01/07/26");
	});

	test("keeps an empty date blank", () => {
		expect(formatIndexDate("")).toBe("");
	});
});
