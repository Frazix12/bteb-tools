// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		search,
		to,
	}: {
		children: React.ReactNode;
		search: { redirect: string };
		to: string;
	}) => (
		<a href={`${to}?redirect=${encodeURIComponent(search.redirect)}`}>
			{children}
		</a>
	),
}));

import { SignInAction } from "./sign-in-action";

afterEach(cleanup);

test("links a restricted action to login with its editor return URL", () => {
	render(
		<SignInAction redirect="/cover-page/new?preset=cover">
			Sign in to save
		</SignInAction>,
	);
	expect(
		screen.getByRole("link", { name: "Sign in to save" }).getAttribute("href"),
	).toBe("/login?redirect=%2Fcover-page%2Fnew%3Fpreset%3Dcover");
});
