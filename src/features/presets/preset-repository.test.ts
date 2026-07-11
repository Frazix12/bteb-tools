import { describe, expect, test, vi } from "vitest";

vi.mock("#/db", () => ({ db: {} }));

import type { PresetRecord } from "./preset-repository";
import { createPresetRepository } from "./preset-repository";

const rows: PresetRecord[] = [
	{
		slug: "enabled-index",
		title: "Enabled",
		description: "Enabled preset",
		type: "index_sheet",
		data: {},
		enabled: true,
	},
	{
		slug: "disabled-cover",
		title: "Disabled",
		description: "Disabled preset",
		type: "cover_page",
		data: {},
		enabled: false,
	},
];

describe("preset repository contract", () => {
	test("lists enabled presets without returning payload data", async () => {
		const repository = createPresetRepository({ rows });
		expect(await repository.listEnabled()).toEqual([
			{
				slug: "enabled-index",
				title: "Enabled",
				description: "Enabled preset",
				type: "index_sheet",
			},
		]);
	});

	test("finds only enabled presets whose type matches", async () => {
		const repository = createPresetRepository({ rows });
		expect(
			await repository.findEnabled("enabled-index", "index_sheet"),
		).toEqual(rows[0]);
		expect(
			await repository.findEnabled("enabled-index", "cover_page"),
		).toBeNull();
		expect(
			await repository.findEnabled("disabled-cover", "cover_page"),
		).toBeNull();
		expect(await repository.findEnabled("missing", "index_sheet")).toBeNull();
	});
});
