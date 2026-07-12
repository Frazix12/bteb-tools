// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ThemeProvider, useTheme } from "./theme-provider";

function Probe() {
	const { mode, setMode } = useTheme();
	return (
		<>
			<button type="button" onClick={() => setMode("dark")}>
				{mode}
			</button>
			<button type="button" onClick={() => setMode("system")}>
				Use system
			</button>
		</>
	);
}

beforeEach(() => {
	const values = new Map<string, string>();
	Object.defineProperty(window, "localStorage", {
		configurable: true,
		value: {
			clear: () => values.clear(),
			getItem: (key: string) => values.get(key) ?? null,
			setItem: (key: string, value: string) => values.set(key, value),
		},
	});
	document.documentElement.className = "";
	document.documentElement.removeAttribute("data-theme");
});

afterEach(cleanup);

test("persists and applies an explicit selection", () => {
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		value: vi.fn(() => ({
			matches: false,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
	});

	render(
		<ThemeProvider>
			<Probe />
		</ThemeProvider>,
	);
	fireEvent.click(screen.getByRole("button", { name: "system" }));

	expect(window.localStorage.getItem("theme")).toBe("dark");
	expect(document.documentElement.classList.contains("dark")).toBe(true);
});

test("reapplies media-query changes only while using system mode", () => {
	let changeListener: (() => void) | undefined;
	const mediaQuery = {
		matches: false,
		addEventListener: vi.fn((_event: string, listener: () => void) => {
			changeListener = listener;
		}),
		removeEventListener: vi.fn(),
	};
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		value: vi.fn(() => mediaQuery),
	});

	const { unmount } = render(
		<ThemeProvider>
			<Probe />
		</ThemeProvider>,
	);
	mediaQuery.matches = true;
	changeListener?.();
	expect(document.documentElement.classList.contains("dark")).toBe(true);

	fireEvent.click(screen.getByRole("button", { name: "system" }));
	mediaQuery.matches = false;
	changeListener?.();
	expect(document.documentElement.classList.contains("dark")).toBe(true);

	fireEvent.click(screen.getByRole("button", { name: "Use system" }));
	changeListener?.();
	expect(document.documentElement.classList.contains("light")).toBe(true);

	unmount();
	expect(mediaQuery.removeEventListener).toHaveBeenCalledWith(
		"change",
		expect.any(Function),
	);
});
