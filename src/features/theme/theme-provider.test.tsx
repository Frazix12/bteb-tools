// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ThemeProvider, useTheme } from "./theme-provider";
import { ThemeToggle } from "./theme-toggle";

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
	Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
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
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		value: vi.fn(() => ({
			matches: false,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
	});
});

afterEach(cleanup);

test.each([
	"light",
	"dark",
] as const)("hydrates stored %s mode without a markup mismatch", async (mode) => {
	const markup = renderToString(
		<ThemeProvider>
			<ThemeToggle />
		</ThemeProvider>,
	);
	window.localStorage.setItem("theme", mode);
	const container = document.createElement("div");
	container.innerHTML = markup;
	document.body.append(container);
	const consoleError = vi
		.spyOn(console, "error")
		.mockImplementation(() => undefined);
	let root: ReturnType<typeof hydrateRoot> | undefined;

	await act(async () => {
		root = hydrateRoot(
			container,
			<ThemeProvider>
				<ThemeToggle />
			</ThemeProvider>,
		);
	});

	expect(
		container.querySelector(`button[aria-pressed="true"]`)?.textContent,
	).toBe(mode === "light" ? "Light" : "Dark");
	expect(consoleError).not.toHaveBeenCalled();

	await act(async () => root?.unmount());
	consoleError.mockRestore();
	container.remove();
});

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

test("falls back to system mode when storage reads throw", () => {
	Object.defineProperty(window, "localStorage", {
		configurable: true,
		value: {
			getItem: () => {
				throw new DOMException("Blocked", "SecurityError");
			},
			setItem: vi.fn(),
		},
	});

	expect(() =>
		render(
			<ThemeProvider>
				<Probe />
			</ThemeProvider>,
		),
	).not.toThrow();
	expect(screen.getByRole("button", { name: "system" })).toBeTruthy();
	expect(document.documentElement.classList.contains("light")).toBe(true);
});

test("keeps theme changes in memory when storage writes throw", () => {
	Object.defineProperty(window, "localStorage", {
		configurable: true,
		value: {
			getItem: () => null,
			setItem: () => {
				throw new DOMException("Blocked", "SecurityError");
			},
		},
	});

	render(
		<ThemeProvider>
			<Probe />
		</ThemeProvider>,
	);
	expect(() =>
		fireEvent.click(screen.getByRole("button", { name: "system" })),
	).not.toThrow();
	expect(screen.getByRole("button", { name: "dark" })).toBeTruthy();
	expect(document.documentElement.classList.contains("dark")).toBe(true);
});
