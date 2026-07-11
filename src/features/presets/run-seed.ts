import { config } from "dotenv";

config({ path: [".env.local", ".env"] });
const [{ drizzlePresetRepository }, { seedPresets }] = await Promise.all([
	import("./preset-repository"),
	import("./seed"),
]);
await seedPresets(drizzlePresetRepository);
console.log("Preset seed complete.");
