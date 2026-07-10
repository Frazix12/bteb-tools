import { describe, expect, test } from "vitest";

import type { CoverPageData } from "#/orpc/schemas/document";

import { createInlineLogoStorage } from "./logo-storage";

const coverData: CoverPageData = {
	schemaVersion: 1,
	exportedAt: "2026-07-10T08:00:00.000Z",
	type: "cover-page",
	instituteName: "Example Institute",
	instituteShort: "",
	department: "Computer Science",
	docType: "Assignment",
	logoDataUrl: "",
	submittedBy: {
		name: "Student",
		regNo: "",
		roll: "",
		subjectName: "Mathematics",
		subjectCode: "",
		session: "",
		semester: "",
	},
	submittedTo: { name: "Teacher", designation: "Lecturer", department: "" },
};

describe("inline logo storage", () => {
	const storage = createInlineLogoStorage({ maxEncodedBytes: 64 });

	test("accepts supported image data URLs", () => {
		expect(storage.normalize("data:image/png;base64,aGVsbG8=")).toBe(
			"data:image/png;base64,aGVsbG8=",
		);
	});

	test("normalizes an empty logo to null", () => {
		expect(storage.normalize("")).toBeNull();
		expect(storage.normalize(null)).toBeNull();
	});

	test("rejects unsupported and oversized logos", () => {
		expect(() =>
			storage.normalize("data:image/svg+xml;base64,aGVsbG8="),
		).toThrow("PNG, JPEG, or WebP");
		expect(() =>
			storage.normalize(`data:image/png;base64,${"a".repeat(65)}`),
		).toThrow("too large");
	});

	test("rehydrates the legacy payload from the stored logo", () => {
		const logo = "data:image/webp;base64,aGVsbG8=";
		expect(storage.toDocumentData(coverData, logo).logoDataUrl).toBe(logo);
		expect(storage.toDocumentData(coverData, null).logoDataUrl).toBe("");
	});
});
