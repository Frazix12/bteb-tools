import { autofillRouter } from "./autofill";
import { documentRouter } from "./documents";
import { presetRouter } from "./presets";

export default {
	autofill: autofillRouter,
	documents: documentRouter,
	presets: presetRouter,
};
