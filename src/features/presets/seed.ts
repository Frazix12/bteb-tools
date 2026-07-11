import type { PresetRepository } from "./preset-repository";
import { documentPresets } from "./seed-data";

export async function seedPresets(repository: PresetRepository) {
	for (const preset of documentPresets) await repository.upsertSeed(preset);
}
