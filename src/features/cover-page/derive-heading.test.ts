import { describe, expect, test } from "vitest";

import { deriveAssignmentHeading } from "./derive-heading";

describe("deriveAssignmentHeading", () => {
	test.each([
		["", "Assignment", "Assignment"],
		["Mathematics-3", "Assignment", "Mathematics Assignment"],
		["Web Development", "Assignment", "Assignment"],
		["physics2", "Lab Report", "Physics Lab Report"],
		["Mathematics", "", "Mathematics Assignment"],
	])("derives the reference heading from %j", (subject, type, expected) => {
		expect(deriveAssignmentHeading(subject, type)).toBe(expected);
	});
});
