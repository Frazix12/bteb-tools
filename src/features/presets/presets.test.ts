import { describe, expect, it } from "vitest";
import {
	documentPresets,
	getDocumentPreset,
	getDocumentPresetData,
} from "./presets";

describe("document presets", () => {
	it("includes the ISTT cover page preset", () => {
		const preset = getDocumentPreset("istt-cover-page");
		expect(preset?.type).toBe("cover_page");
		const data = getDocumentPresetData("istt-cover-page", "cover_page");
		expect(data?.instituteShort).toBe("(ISTT)");
		expect(data?.logoDataUrl).toMatch(/^data:image\/webp;base64,/);
	});

	it("returns cloned data only for the requested type", () => {
		const cover = getDocumentPresetData("istt-cover-page", "cover_page");
		expect(cover?.type).toBe("cover-page");
		expect(getDocumentPresetData("istt-cover-page", "index_sheet")).toBeNull();
		expect(getDocumentPresetData("missing", "cover_page")).toBeNull();
	});

	it("exposes presets for listing", () => {
		expect(documentPresets.map((preset) => preset.slug)).toEqual(
			expect.arrayContaining([
				"istt-cover-page",
				"math-index-sheet",
				"physics-index-sheet",
			]),
		);
	});

	it("includes math and physics index sheet presets", () => {
		const math = getDocumentPresetData("math-index-sheet", "index_sheet");
		const physics = getDocumentPresetData("physics-index-sheet", "index_sheet");
		expect(math?.entries).toHaveLength(10);
		expect(math?.entries[0]?.pageNo).toBe("1-4");
		expect(physics?.entries).toHaveLength(5);
		expect(physics?.entries[0]?.pageNo).toBe("1-6");
	});
});
