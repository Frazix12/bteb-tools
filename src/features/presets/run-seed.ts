import { drizzlePresetRepository } from "./preset-repository";
import { seedPresets } from "./seed";

await seedPresets(drizzlePresetRepository);
console.log("Preset seed complete.");
