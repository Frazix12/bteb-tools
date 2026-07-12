import { describe, expect, test, vi } from "vitest";

const { getCurrentSessionMock } = vi.hoisted(() => ({
	getCurrentSessionMock: vi.fn(),
}));

vi.mock("./current-session", () => ({
	getCurrentSession: getCurrentSessionMock,
}));

import { requireSession } from "./require-session";

describe("requireSession", () => {
	test("redirects anonymous visitors to login with the current URL", async () => {
		getCurrentSessionMock.mockResolvedValue(null);
		await expect(requireSession("/dashboard?tab=recent")).rejects.toMatchObject(
			{
				options: {
					to: "/login",
					search: { redirect: "/dashboard?tab=recent" },
				},
			},
		);
	});

	test("returns the signed-in user", async () => {
		const user = { id: "user-1", role: "user" };
		getCurrentSessionMock.mockResolvedValue({ user, session: { id: "s" } });
		await expect(requireSession("/dashboard")).resolves.toEqual({ user });
	});
});
