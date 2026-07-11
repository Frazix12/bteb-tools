// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
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
	useRouteContext: () => ({ user: { role } }),
}));

import { AppShell } from "./app-shell";

afterEach(cleanup);

describe("app shell navigation", () => {
	test("shows standard navigation but hides admin from users", () => {
		role = "user";
		render(<AppShell />);
		expect(screen.getByRole("link", { name: "Dashboard" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Presets" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
		expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
	});

	test("shows admin navigation to administrators", () => {
		role = "admin";
		render(<AppShell />);
		expect(screen.getByRole("link", { name: "Admin" })).toBeTruthy();
	});
});
