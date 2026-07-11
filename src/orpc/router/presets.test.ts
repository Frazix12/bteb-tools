import { createRouterClient } from "@orpc/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { PresetRepository } from "#/features/presets/preset-repository";

const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));
vi.mock("#/lib/session", () => ({ getSession: getSessionMock }));
vi.mock("#/features/presets/preset-repository", () => ({
	drizzlePresetRepository: {},
}));

import { createPresetRouter } from "./presets";

function repository(): PresetRepository {
	return {
		listEnabled: vi.fn(async () => []),
		findEnabled: vi.fn(async () => null),
		upsertSeed: vi.fn(async () => undefined),
	};
}

describe("preset procedures", () => {
	beforeEach(() => getSessionMock.mockReset());

	test("requires authentication before querying presets", async () => {
		getSessionMock.mockResolvedValue(null);
		const repo = repository();
		const client = createRouterClient(createPresetRouter(repo), {
			context: { headers: new Headers() },
		});
		await expect(client.list({})).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
		await expect(
			client.getEnabled({ slug: "x", type: "cover_page" }),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		expect(repo.listEnabled).not.toHaveBeenCalled();
		expect(repo.findEnabled).not.toHaveBeenCalled();
	});

	test("maps missing, disabled, or mismatched presets to not found", async () => {
		getSessionMock.mockResolvedValue({
			session: { id: "s" },
			user: { id: "u" },
		});
		const client = createRouterClient(createPresetRouter(repository()), {
			context: { headers: new Headers() },
		});
		await expect(
			client.getEnabled({ slug: "missing", type: "index_sheet" }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	test("rejects stored payloads that do not match their document schema", async () => {
		getSessionMock.mockResolvedValue({
			session: { id: "s" },
			user: { id: "u" },
		});
		const repo = repository();
		vi.mocked(repo.findEnabled).mockResolvedValue({
			slug: "broken",
			title: "Broken",
			description: "Broken",
			type: "cover_page",
			data: { schemaVersion: 999 },
			enabled: true,
		});
		const client = createRouterClient(createPresetRouter(repo), {
			context: { headers: new Headers() },
		});
		await expect(
			client.getEnabled({ slug: "broken", type: "cover_page" }),
		).rejects.toThrow();
	});
});
