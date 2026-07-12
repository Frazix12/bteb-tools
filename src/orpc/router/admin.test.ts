import { createRouterClient } from "@orpc/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
	AdminTargetNotFoundError,
	DuplicatePresetSlugError,
	InvalidRoleTransitionError,
} from "#/features/admin/admin-repository";
import { DuplicateAiKeyError } from "#/features/ai-keys/repository";

const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));
vi.mock("#/lib/session", () => ({ getSession: getSessionMock }));
vi.mock("#/env", () => ({
	env: { GEMINI_MODEL: "gemini-3.1-flash-lite", GEMINI_API_KEY: undefined },
}));
vi.mock("#/features/admin/admin-repository", () => ({
	AdminTargetNotFoundError: class AdminTargetNotFoundError extends Error {},
	DuplicatePresetSlugError: class DuplicatePresetSlugError extends Error {},
	InvalidRoleTransitionError: class InvalidRoleTransitionError extends Error {},
	drizzleAdminRepository: {},
}));
vi.mock("#/features/ai-keys/repository", () => ({
	AiKeyNotFoundError: class AiKeyNotFoundError extends Error {},
	DuplicateAiKeyError: class DuplicateAiKeyError extends Error {},
	drizzleAiKeyRepository: {},
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
	const ai = aiDependencies();
	return createRouterClient(
		createAdminRouter({ repository: repo as never, ...ai } as never),
		{
			context: { headers: new Headers() },
		},
	);
}

function aiDependencies() {
	return {
		keyRepository: {
			list: vi.fn(),
			create: vi.fn(),
			replace: vi.fn(),
			setEnabled: vi.fn(),
			delete: vi.fn(),
		},
		keyPool: { validateOne: vi.fn(), validateAll: vi.fn() },
	};
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
		() => client.aiKeys.list({}),
		() => client.aiKeys.create({ label: "key", apiKey: "secret" }),
		() => client.aiKeys.replace({ id, apiKey: "secret" }),
		() => client.aiKeys.setEnabled({ id, enabled: false }),
		() => client.aiKeys.delete({ id }),
		() => client.aiKeys.validate({ id }),
		() => client.aiKeys.validateAll({}),
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
		const malformed = await client.presets
			.create({ ...write, data: {} } as never)
			.catch((error: unknown) => error);
		const value = malformed as { data?: unknown };
		expect(malformed).toMatchObject({
			code: "BAD_REQUEST",
			data: {
				issues: expect.arrayContaining([
					expect.objectContaining({
						path: ["data", "schemaVersion"],
						message: "Invalid input: expected 1",
					}),
				]),
			},
		});
		expect(value.data).not.toHaveProperty("fieldErrors");
	});
});

describe("admin AI key procedures", () => {
	beforeEach(() =>
		getSessionMock.mockResolvedValue({
			session: { id: "s" },
			user: { id: "admin", role: "admin" },
		}),
	);

	test("delegates every operation and returns public metadata only", async () => {
		const repo = repository();
		const ai = aiDependencies();
		const publicKey = {
			id,
			provider: "google",
			label: "Primary",
			maskedSuffix: "1234",
			enabled: true,
			validationStatus: "valid",
			cooldownUntil: null,
			lastCheckedAt: null,
			lastUsedAt: null,
			lastSuccessAt: null,
			lastFailureAt: null,
			failureCode: null,
			failureMessage: null,
			encryptedSecret: "ciphertext",
			fingerprint: "digest",
		};
		ai.keyRepository.list.mockResolvedValue([publicKey]);
		ai.keyRepository.create.mockResolvedValue(publicKey);
		ai.keyRepository.replace.mockResolvedValue(publicKey);
		ai.keyRepository.setEnabled.mockResolvedValue(publicKey);
		ai.keyRepository.delete.mockResolvedValue(undefined);
		ai.keyPool.validateOne.mockResolvedValue(publicKey);
		ai.keyPool.validateAll.mockResolvedValue([publicKey]);
		const client = createRouterClient(
			createAdminRouter({ repository: repo as never, ...ai } as never),
			{ context: { headers: new Headers() } },
		);
		const results = [
			await client.aiKeys.list({}),
			await client.aiKeys.create({
				label: "  Primary  ",
				apiKey: "secret-value",
			}),
			await client.aiKeys.replace({ id, apiKey: "replacement-secret" }),
			await client.aiKeys.setEnabled({ id, enabled: false }),
			await client.aiKeys.delete({ id }),
			await client.aiKeys.validate({ id }),
			await client.aiKeys.validateAll({}),
		];
		expect(ai.keyRepository.create).toHaveBeenCalledWith({
			label: "Primary",
			apiKey: "secret-value",
			actorId: "admin",
		});
		expect(ai.keyRepository.replace).toHaveBeenCalledWith(id, {
			label: "Primary",
			apiKey: "replacement-secret",
			actorId: "admin",
		});
		expect(ai.keyRepository.setEnabled).toHaveBeenCalledWith(
			id,
			false,
			"admin",
		);
		expect(ai.keyRepository.delete).toHaveBeenCalledWith(id);
		expect(ai.keyPool.validateOne).toHaveBeenCalledWith(id);
		const serialized = JSON.stringify(results);
		expect(serialized).not.toContain("secret-value");
		expect(serialized).not.toContain("replacement-secret");
		expect(serialized).not.toContain("encryptedSecret");
		expect(serialized).not.toContain("fingerprint");
	});

	test("maps duplicate and missing keys to sanitized errors", async () => {
		const ai = aiDependencies();
		ai.keyRepository.create.mockRejectedValue(
			new DuplicateAiKeyError("leaked secret"),
		);
		ai.keyRepository.list.mockResolvedValue([]);
		const client = createRouterClient(
			createAdminRouter({ repository: repository() as never, ...ai } as never),
			{ context: { headers: new Headers() } },
		);
		await expect(
			client.aiKeys.create({ label: "key", apiKey: "top-secret" }),
		).rejects.toMatchObject({
			code: "CONFLICT",
			message: "AI key already exists.",
		});
		await expect(
			client.aiKeys.replace({ id, apiKey: "top-secret" }),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
			message: "AI key not found.",
		});
	});

	test("validates bounded inputs before calling dependencies", async () => {
		const ai = aiDependencies();
		const client = createRouterClient(
			createAdminRouter({ repository: repository() as never, ...ai } as never),
			{ context: { headers: new Headers() } },
		);
		for (const call of [
			() => client.aiKeys.create({ label: "x".repeat(101), apiKey: "key" }),
			() => client.aiKeys.create({ label: "ok", apiKey: "   " }),
			() => client.aiKeys.create({ label: "ok", apiKey: "x".repeat(501) }),
			() => client.aiKeys.replace({ id: "bad", apiKey: "key" }),
		])
			await expect(call()).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(ai.keyRepository.create).not.toHaveBeenCalled();
		expect(ai.keyRepository.replace).not.toHaveBeenCalled();
	});
});
