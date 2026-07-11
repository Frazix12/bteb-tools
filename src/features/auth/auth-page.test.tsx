// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

const { social } = vi.hoisted(() => ({ social: vi.fn() }));

vi.mock("#/lib/auth-client", () => ({
	authClient: { signIn: { social } },
}));

import { AuthPage } from "./auth-page";

beforeEach(() => social.mockReset());

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
