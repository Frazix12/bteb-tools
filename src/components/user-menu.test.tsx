// @vitest-environment jsdom

import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ThemeProvider } from "#/features/theme/theme-provider";
import { UserMenu } from "./user-menu";

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

test("falls back when a profile image cannot load", () => {
	render(
		<ThemeProvider>
			<UserMenu
				user={{ name: "Irfan", email: "irfan@example.com", image: "/bad.png" }}
				onLogout={vi.fn()}
			/>
		</ThemeProvider>,
	);

	fireEvent.error(document.querySelector("img") as HTMLImageElement);
	expect(document.querySelector("img")).toBeNull();
	expect(screen.getByRole("button", { name: "Open user menu" })).toBeTruthy();
});

test("selects and persists a theme with menu keyboard controls", async () => {
	render(
		<ThemeProvider>
			<UserMenu
				user={{ name: "Irfan", email: "irfan@example.com" }}
				onLogout={vi.fn()}
			/>
		</ThemeProvider>,
	);

	fireEvent.pointerDown(
		screen.getByRole("button", { name: "Open user menu" }),
		{
			button: 0,
			ctrlKey: false,
		},
	);
	const light = screen.getByRole("menuitemradio", { name: "Light" });
	light.focus();
	fireEvent.keyDown(light, { key: "ArrowDown" });
	await waitFor(() =>
		expect(document.activeElement).toBe(
			screen.getByRole("menuitemradio", { name: "Dark" }),
		),
	);
	fireEvent.keyDown(document.activeElement as Element, { key: "Enter" });

	await waitFor(() =>
		expect(window.localStorage.getItem("theme")).toBe("dark"),
	);
	expect(document.documentElement.dataset.theme).toBe("dark");
});
