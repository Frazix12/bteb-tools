import { createRouterClient } from "@orpc/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
	AdminTargetNotFoundError,
	DuplicatePresetSlugError,
	InvalidRoleTransitionError,
} from "#/features/admin/admin-repository";

const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));
vi.mock("#/lib/session", () => ({ getSession: getSessionMock }));
vi.mock("#/features/admin/admin-repository", () => ({
	AdminTargetNotFoundError: class AdminTargetNotFoundError extends Error {},
	DuplicatePresetSlugError: class DuplicatePresetSlugError extends Error {},
	InvalidRoleTransitionError: class InvalidRoleTransitionError extends Error {},
	drizzleAdminRepository: {},
}));

import { createAdminRouter } from "./admin";

const id = "11111111-1111-4111-8111-111111111111";
const indexData = {
	schemaVersion: 1 as const,
	exportedAt: "2026-07-10T08:00:00.000Z",
	title: "INDEX",
	rowsPerPage: 10 as const,
	showPageNo: false,
	entries: [],
};
const write = {
	slug: "index",
	title: "Index",
	description: "",
	enabled: true,
	type: "index_sheet" as const,
	data: indexData,
};

function repository() {
	return Object.fromEntries(
		[
			"listUsers",
			"setUserRole",
			"usageSummary",
			"dataSummary",
			"listDocuments",
			"deleteDocument",
			"listPresets",
			"createPreset",
			"updatePreset",
			"setPresetEnabled",
			"deletePreset",
		].map((name) => [name, vi.fn()]),
	) as Record<string, ReturnType<typeof vi.fn>>;
}
function makeClient(repo: ReturnType<typeof repository>) {
	return createRouterClient(createAdminRouter(repo as never), {
		context: { headers: new Headers() },
	});
}

function calls(client: ReturnType<typeof makeClient>) {
	return [
		() => client.users.list({ page: 1, pageSize: 20 }),
		() => client.users.setRole({ userId: "u", role: "admin" }),
		() => client.usage.summary({}),
		() => client.data.summary({}),
		() => client.data.listDocuments({ page: 1, pageSize: 20 }),
		() => client.data.deleteDocument({ id }),
		() => client.presets.list({ page: 1, pageSize: 20 }),
		() => client.presets.create(write),
		() => client.presets.update({ id, ...write }),
		() => client.presets.setEnabled({ id, enabled: false }),
		() => client.presets.delete({ id }),
	];
}

describe("admin procedures", () => {
	beforeEach(() => getSessionMock.mockReset());
	for (const [label, session, code] of [
		["anonymous", null, "UNAUTHORIZED"],
		[
			"ordinary user",
			{ session: { id: "s" }, user: { id: "u", role: "user" } },
			"FORBIDDEN",
		],
	] as const) {
		test(`denies every branch to ${label}`, async () => {
			getSessionMock.mockResolvedValue(session);
			const repo = repository();
			const client = makeClient(repo);
			for (const call of calls(client))
				await expect(call()).rejects.toMatchObject({ code });
			for (const method of Object.values(repo))
				expect(method).not.toHaveBeenCalled();
		});
	}

	test("delegates all successful DTO, aggregate, and mutation contracts", async () => {
		getSessionMock.mockResolvedValue({
			session: { id: "s" },
			user: { id: "admin", role: "admin" },
		});
		const repo = repository();
		for (const [name, value] of Object.entries({
			listUsers: {
				items: [{ documentCount: 2 }],
				total: 1,
				page: 2,
				pageSize: 5,
			},
			usageSummary: {
				totals: { events: 3, costMicros: "12" },
				byModel: [{ provider: "openai", model: "gpt", costMicros: "12" }],
			},
			dataSummary: { users: 1, documents: 2, presets: 3 },
			listDocuments: { items: [{ id }], total: 1 },
			listPresets: { items: [{ id }], total: 1 },
			setUserRole: { id: "u", role: "admin" },
			createPreset: { id },
			updatePreset: { id },
			setPresetEnabled: { id, enabled: false },
		}))
			repo[name].mockResolvedValue(value);
		for (const name of ["deleteDocument", "deletePreset"])
			repo[name].mockResolvedValue(undefined);
		const client = makeClient(repo);
		expect(await client.users.list({ page: 2, pageSize: 5 })).toMatchObject({
			total: 1,
		});
		expect(await client.usage.summary({})).toMatchObject({
			totals: { costMicros: "12" },
		});
		expect(await client.data.summary({})).toEqual({
			users: 1,
			documents: 2,
			presets: 3,
		});
		await client.users.setRole({ userId: "u", role: "admin" });
		await client.data.listDocuments({ page: 1, pageSize: 10 });
		await client.data.deleteDocument({ id });
		await client.presets.list({ page: 1, pageSize: 10 });
		await client.presets.create(write);
		await client.presets.update({ id, ...write });
		await client.presets.setEnabled({ id, enabled: false });
		await client.presets.delete({ id });
		expect(repo.createPreset).toHaveBeenCalledWith(write, "admin");
		expect(repo.updatePreset).toHaveBeenCalledWith(id, write, "admin");
		expect(repo.setPresetEnabled).toHaveBeenCalledWith(id, false, "admin");
	});

	test("describes bootstrap-account demotion failures accurately", async () => {
		getSessionMock.mockResolvedValue({
			session: { id: "s" },
			user: { id: "admin", role: "admin" },
		});
		const repo = repository();
		repo.setUserRole.mockRejectedValue(new InvalidRoleTransitionError());
		await expect(
			makeClient(repo).users.setRole({ userId: "bootstrap", role: "user" }),
		).rejects.toMatchObject({
			code: "FORBIDDEN",
			message: "The protected bootstrap account cannot be demoted.",
		});
	});

	test("maps repository errors and rejects bad input before persistence", async () => {
		getSessionMock.mockResolvedValue({
			session: { id: "s" },
			user: { id: "admin", role: "admin" },
		});
		const repo = repository();
		repo.setUserRole.mockRejectedValue(new InvalidRoleTransitionError());
		repo.deleteDocument.mockRejectedValue(new AdminTargetNotFoundError());
		repo.createPreset.mockRejectedValue(new DuplicatePresetSlugError());
		const client = makeClient(repo);
		await expect(
			client.users.setRole({ userId: "admin", role: "user" }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(client.data.deleteDocument({ id })).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
		await expect(client.presets.create(write)).rejects.toMatchObject({
			code: "CONFLICT",
		});
		await expect(
			client.users.list({ page: 0, pageSize: 101 }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		await expect(
			client.presets.create({ ...write, data: {} } as never),
		).rejects.toMatchObject({ code: "BAD_REQUEST", data: expect.anything() });
	});
});
