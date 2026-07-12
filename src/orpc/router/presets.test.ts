import { createRouterClient } from "@orpc/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { createBlankCoverPage } from "#/features/cover-page/defaults";
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

	test("allows anonymous visitors to query enabled presets", async () => {
		getSessionMock.mockResolvedValue(null);
		const repo = repository();
		vi.mocked(repo.listEnabled).mockResolvedValue([]);
		const client = createRouterClient(createPresetRouter(repo), {
			context: { headers: new Headers() },
		});

		await expect(client.list({})).resolves.toEqual([]);
		expect(repo.listEnabled).toHaveBeenCalledOnce();
	});

	test("allows anonymous visitors to query an enabled preset", async () => {
		getSessionMock.mockResolvedValue(null);
		const repo = repository();
		vi.mocked(repo.findEnabled).mockResolvedValue({
			slug: "cover",
			title: "Cover",
			description: "Cover preset",
			type: "cover_page",
			data: createBlankCoverPage(),
			enabled: true,
		});
		const client = createRouterClient(createPresetRouter(repo), {
			context: { headers: new Headers() },
		});

		await expect(
			client.getEnabled({ slug: "cover", type: "cover_page" }),
		).resolves.toMatchObject({ slug: "cover", type: "cover_page" });
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
