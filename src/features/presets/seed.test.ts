import { describe, expect, test, vi } from "vitest";

vi.mock("#/db", () => ({ db: {} }));

import type { PresetRecord } from "./preset-repository";
import { createPresetRepository } from "./preset-repository";
import { seedPresets } from "./seed";

describe("preset seed", () => {
	test("is idempotent and retains exactly three stable slugs", async () => {
		const rows: PresetRecord[] = [];
		const repository = createPresetRepository({ rows });
		await seedPresets(repository);
		await seedPresets(repository);
		expect(rows.map((row) => row.slug).sort()).toEqual([
			"istt-cover-page",
			"math-index-sheet",
			"physics-index-sheet",
		]);
		expect(rows).toHaveLength(3);
	});
});
