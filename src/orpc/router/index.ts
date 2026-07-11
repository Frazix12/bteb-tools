import { adminRouter } from "./admin";
import { autofillRouter } from "./autofill";
import { documentRouter } from "./documents";
import { presetRouter } from "./presets";

export default {
	admin: adminRouter,
	autofill: autofillRouter,
	documents: documentRouter,
	presets: presetRouter,
};
