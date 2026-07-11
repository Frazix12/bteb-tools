// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { social } = vi.hoisted(() => ({ social: vi.fn() }));

vi.mock("#/lib/auth-client", () => ({
	authClient: { signIn: { social } },
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children, to }: { children: ReactNode; to: string }) => (
		<a href={to}>{children}</a>
	),
}));

import { AuthPage } from "./auth-page";

beforeEach(() => social.mockReset());
afterEach(cleanup);

test("starts Google sign-in and has no credential controls", async () => {
	social.mockResolvedValue({ error: null });
	render(<AuthPage />);

	expect(screen.queryByLabelText(/email/i)).toBeNull();
	expect(screen.queryByLabelText(/password/i)).toBeNull();
	expect(screen.queryByText(/sign up|create account/i)).toBeNull();

	fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
	expect(social).toHaveBeenCalledWith({
		provider: "google",
		callbackURL: "/dashboard",
	});
});

test("lets visitors continue without signing in", () => {
	render(<AuthPage />);
	expect(
		screen
			.getByRole("link", { name: /continue without signing in/i })
			.getAttribute("href"),
	).toBe("/presets");
});
