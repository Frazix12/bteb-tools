import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useState,
} from "react";

import {
	applyTheme,
	readThemeMode,
	THEME_STORAGE_KEY,
	type ThemeMode,
} from "./theme";

interface ThemeContextValue {
	mode: ThemeMode;
	setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [mode, setMode] = useState<ThemeMode>("system");
	const [initialized, setInitialized] = useState(false);

	useLayoutEffect(() => {
		setMode(readThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY)));
		setInitialized(true);
	}, []);

	useEffect(() => {
		if (!initialized) return;

		window.localStorage.setItem(THEME_STORAGE_KEY, mode);
		applyTheme(mode);

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = () => {
			if (mode === "system") applyTheme(mode);
		};
		mediaQuery.addEventListener("change", handleChange);

		return () => mediaQuery.removeEventListener("change", handleChange);
	}, [initialized, mode]);

	const value = useMemo(() => ({ mode, setMode }), [mode]);

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
}

export function useTheme(): ThemeContextValue {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
}
