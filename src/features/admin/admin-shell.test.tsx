// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

let pathname = "/admin/users";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		to,
		onClick,
		...props
	}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
		<a href={to} onClick={onClick} {...props}>
			{children}
		</a>
	),
	Outlet: () => <div data-testid="admin-outlet" />,
	useLocation: () => ({ pathname }),
	useNavigate: () => vi.fn(),
	useRouteContext: () => ({
		user: { name: "Admin User", email: "admin@example.com", image: null },
	}),
	useRouter: () => ({
		invalidate: vi.fn(),
		options: { context: { queryClient: { clear: vi.fn() } } },
	}),
}));

vi.mock("#/features/theme/theme-toggle", () => ({
	ThemeToggle: () => <button type="button">Theme control</button>,
}));

vi.mock("#/components/user-menu", () => ({
	UserMenu: () => <button type="button">User menu</button>,
}));

import { AdminShell } from "./admin-shell";

afterEach(cleanup);

describe("admin shell", () => {
	test("renders all administration destinations and the nested route", () => {
		render(<AdminShell />);

		expect(
			screen.getByRole("navigation", { name: "Admin navigation" }),
		).toBeTruthy();
		expect(
			screen.getAllByRole("link", { name: "Overview" })[0].getAttribute("href"),
		).toBe("/admin");
		expect(
			screen.getAllByRole("link", { name: "Users" })[0].getAttribute("href"),
		).toBe("/admin/users");
		expect(
			screen.getAllByRole("link", { name: "Usage" })[0].getAttribute("href"),
		).toBe("/admin/usage");
		expect(
			screen.getAllByRole("link", { name: "AI keys" })[0].getAttribute("href"),
		).toBe("/admin/ai-keys");
		expect(
			screen
				.getAllByRole("link", { name: "Documents" })[0]
				.getAttribute("href"),
		).toBe("/admin/documents");
		expect(
			screen.getAllByRole("link", { name: "Presets" })[0].getAttribute("href"),
		).toBe("/admin/presets");
		expect(
			screen
				.getAllByRole("link", { name: "Back to site" })[0]
				.getAttribute("href"),
		).toBe("/dashboard");
		expect(screen.getByTestId("admin-outlet")).toBeTruthy();
	});

	test("marks the exact current destination", () => {
		pathname = "/admin/users";
		render(<AdminShell />);
		for (const link of screen.getAllByRole("link", { name: "Users" })) {
			expect(link.getAttribute("aria-current")).toBe("page");
		}
		expect(
			screen
				.getAllByRole("link", { name: "Overview" })[0]
				.hasAttribute("aria-current"),
		).toBe(false);
	});

	test("opens and closes the mobile navigation after selecting a destination", () => {
		render(<AdminShell />);
		fireEvent.click(
			screen.getByRole("button", { name: "Open admin navigation" }),
		);
		expect(screen.getByRole("dialog")).toBeTruthy();
		const usageLinks = screen.getAllByRole("link", { name: "Usage" });
		fireEvent.click(usageLinks[usageLinks.length - 1]);
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	test("hides decorative icons from assistive technology", () => {
		render(<AdminShell />);
		for (const icon of document.querySelectorAll("svg")) {
			expect(icon.getAttribute("aria-hidden")).toBe("true");
		}
	});
});
