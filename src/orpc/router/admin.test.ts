import { createRouterClient } from "@orpc/server";
import { expect, test, vi } from "vitest";

const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));
vi.mock("#/lib/session", () => ({ getSession: getSessionMock }));
vi.mock("#/features/admin/admin-repository", () => ({ drizzleAdminRepository: {} }));

import { createAdminRouter } from "./admin";

test("admin procedures reject ordinary users", async () => {
	getSessionMock.mockResolvedValue({ session: { id: "s" }, user: { id: "u", role: "user" } });
	const repository = { listUsers: vi.fn() } as never;
	const client = createRouterClient(createAdminRouter(repository), { context: { headers: new Headers() } });
	await expect(client.users.list({ page: 1, pageSize: 20 })).rejects.toMatchObject({ code: "FORBIDDEN" });
});

test("validates pagination and typed preset JSON before repository calls", async () => {
	getSessionMock.mockResolvedValue({ session: { id: "s" }, user: { id: "a", role: "admin" } });
	const repository = { listUsers: vi.fn(), createPreset: vi.fn() };
	const client = createRouterClient(createAdminRouter(repository as never), { context: { headers: new Headers() } });
	await expect(client.users.list({ page: 0, pageSize: 101 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
	await expect(client.presets.create({ slug: "x", title: "X", description: "", enabled: true, type: "cover_page", data: {} } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
	expect(repository.listUsers).not.toHaveBeenCalled();
	expect(repository.createPreset).not.toHaveBeenCalled();
});
