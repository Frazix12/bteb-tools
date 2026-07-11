import { createRouterClient } from "@orpc/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));
vi.mock("#/lib/session", () => ({ getSession: getSessionMock }));

import { adminProcedure } from "./auth";

const procedure = adminProcedure.handler(({ context }) => context.user.id);
const client = () =>
	createRouterClient(procedure, { context: { headers: new Headers() } });

describe("adminProcedure", () => {
	beforeEach(() => getSessionMock.mockReset());

	test("rejects anonymous sessions", async () => {
		getSessionMock.mockResolvedValue(null);
		await expect(client()()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});

	test("rejects ordinary users", async () => {
		getSessionMock.mockResolvedValue({ user: { id: "user-1", role: "user" } });
		await expect(client()()).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("allows admins", async () => {
		getSessionMock.mockResolvedValue({
			user: { id: "admin-1", role: "admin" },
		});
		await expect(client()()).resolves.toBe("admin-1");
	});
});
