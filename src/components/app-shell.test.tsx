// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

let role: "user" | "admin" = "user";

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
		<a href={to}>{children}</a>
	),
	Outlet: () => null,
	useNavigate: () => vi.fn(),
	useRouter: () => ({
		invalidate: vi.fn(),
		options: { context: { queryClient: { clear: vi.fn() } } },
	}),
	useRouteContext: () => ({
		user: {
			role,
			name: "Irfan",
			email: "frazixgaming22@gmail.com",
			image: null,
		},
	}),
}));

import { AppShell } from "./app-shell";

afterEach(cleanup);

describe("app shell navigation", () => {
	test("shows standard navigation but hides admin from users", () => {
		role = "user";
		render(<AppShell />);
		expect(screen.getByRole("link", { name: "Home" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Browse Presets" })).toBeTruthy();
		expect(document.querySelector("[data-centered-navigation]")).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
		expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
	});

	test("opens an accessible profile menu with identity and red logout action", () => {
		role = "user";
		render(<AppShell />);
		fireEvent.pointerDown(
			screen.getByRole("button", { name: "Open user menu" }),
			{ button: 0, ctrlKey: false },
		);
		expect(screen.getByText("Irfan")).toBeTruthy();
		expect(screen.getByText("frazixgaming22@gmail.com")).toBeTruthy();
		const logout = screen.getByRole("menuitem", { name: "Log out" });
		expect(logout.className).toContain("text-destructive");
	});

	test("shows admin navigation to administrators", () => {
		role = "admin";
		render(<AppShell />);
		expect(screen.getByRole("link", { name: "Admin" })).toBeTruthy();
	});
});
