export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
export const THEME_STORAGE_KEY = "theme";

export function readThemeMode(value: string | null): ThemeMode {
	return value === "light" || value === "dark" || value === "system"
		? value
		: "system";
}

export function resolveTheme(
	mode: ThemeMode,
	prefersDark: boolean,
): ResolvedTheme {
	return mode === "system" ? (prefersDark ? "dark" : "light") : mode;
}

export function applyTheme(mode: ThemeMode, root = document.documentElement) {
	const resolved = resolveTheme(
		mode,
		window.matchMedia("(prefers-color-scheme: dark)").matches,
	);
	root.classList.remove("light", "dark");
	root.classList.add(resolved);
	root.dataset.theme = mode;
	root.style.colorScheme = resolved;
}

export const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem("theme");var mode=stored==="light"||stored==="dark"||stored==="system"?stored:"system";var dark=window.matchMedia("(prefers-color-scheme: dark)").matches;var resolved=mode==="system"?(dark?"dark":"light"):mode;var root=document.documentElement;root.classList.remove("light","dark");root.classList.add(resolved);root.setAttribute("data-theme",mode);root.style.colorScheme=resolved;}catch(error){}})();`;
