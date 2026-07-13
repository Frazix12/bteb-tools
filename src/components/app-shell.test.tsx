// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

let role: "user" | "admin" | null = "user";
let pathname = "/dashboard";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		to,
		activeProps,
	}: {
		children: React.ReactNode;
		to: string;
		activeProps?: React.AnchorHTMLAttributes<HTMLAnchorElement>;
	}) => (
		<a href={to} {...(pathname === to ? activeProps : undefined)}>
			{children}
		</a>
	),
	Outlet: () => null,
	useNavigate: () => vi.fn(),
	useRouter: () => ({
		invalidate: vi.fn(),
		options: { context: { queryClient: { clear: vi.fn() } } },
	}),
	useRouteContext: () => ({
		user: role
			? {
					role,
					name: "Irfan",
					email: "frazixgaming22@gmail.com",
					image: null,
				}
			: null,
	}),
	useLocation: () => ({ pathname }),
}));

import { ThemeProvider } from "#/features/theme/theme-provider";
import { AppShell } from "./app-shell";

function renderAppShell() {
	return render(
		<ThemeProvider>
			<AppShell />
		</ThemeProvider>,
	);
}

beforeEach(() => {
	const values = new Map<string, string>();
	Object.defineProperty(window, "localStorage", {
		configurable: true,
		value: {
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

afterEach(() => {
	cleanup();
	pathname = "/dashboard";
	role = "user";
});

describe("app shell navigation", () => {
	test("shows standard navigation but hides admin from users", () => {
		role = "user";
		renderAppShell();
		expect(screen.getByRole("link", { name: "Home" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Browse Presets" })).toBeTruthy();
		expect(document.querySelector("[data-centered-navigation]")).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
		expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
	});

	test("lets signed-out visitors choose a theme while retaining sign in", () => {
		role = null;
		renderAppShell();

		expect(screen.getByRole("link", { name: "Sign in" })).toBeTruthy();
		expect(screen.getByRole("group", { name: "Theme" })).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Dark" }));
		expect(document.documentElement.classList.contains("dark")).toBe(true);
		expect(window.localStorage.getItem("theme")).toBe("dark");
	});

	test("marks the current destination as active", () => {
		pathname = "/presets";
		renderAppShell();
		expect(
			screen
				.getByRole("link", { name: "Browse Presets" })
				.getAttribute("aria-current"),
		).toBe("page");
		expect(
			screen.getByRole("link", { name: "Home" }).hasAttribute("aria-current"),
		).toBe(false);
	});

	test("opens an accessible profile menu with identity and red logout action", () => {
		role = "user";
		renderAppShell();
		fireEvent.pointerDown(
			screen.getByRole("button", { name: "Open user menu" }),
			{ button: 0, ctrlKey: false },
		);
		expect(screen.getByText("Irfan")).toBeTruthy();
		expect(screen.getByText("frazixgaming22@gmail.com")).toBeTruthy();
		expect(screen.getByRole("group", { name: "Theme" })).toBeTruthy();
		const logout = screen.getByRole("menuitem", { name: "Log out" });
		expect(logout.className).toContain("text-destructive");
	});

	test("shows admin navigation to administrators", () => {
		pathname = "/dashboard";
		role = "admin";
		renderAppShell();
		expect(screen.getByRole("link", { name: "Admin" })).toBeTruthy();
	});

	test.each([
		"/admin",
		"/admin/users",
	])("suppresses standard navigation on %s", (path) => {
		pathname = path;
		role = "admin";
		renderAppShell();
		expect(screen.queryByRole("link", { name: "Home" })).toBeNull();
		expect(document.querySelector("header")).toBeNull();
	});
});
