import { createRouterClient } from "@orpc/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));
vi.mock("#/lib/session", () => ({ getSession: getSessionMock }));

import {
	NoMeaningfulAutofillFieldsError,
	ProviderAutofillError,
} from "#/features/autofill/extract";
import { createAutofillRouter } from "./autofill";

describe("autofill procedures", () => {
	beforeEach(() => getSessionMock.mockReset());

	test("requires authentication", async () => {
		getSessionMock.mockResolvedValue(null);
		const consumeQuota = vi.fn();
		const extract = vi.fn();
		const client = createRouterClient(
			createAutofillRouter({ consumeQuota, extract }),
			{
				context: { headers: new Headers() },
			},
		);

		await expect(
			client.extract({ type: "index_sheet", text: "Experiment: Ohm's law" }),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		expect(consumeQuota).not.toHaveBeenCalled();
		expect(extract).not.toHaveBeenCalled();
	});

	test("validates text before consuming a provider attempt", async () => {
		getSessionMock.mockResolvedValue({ user: { id: "owner-1" }, session: {} });
		const consumeQuota = vi.fn();
		const client = createRouterClient(
			createAutofillRouter({ consumeQuota, extract: vi.fn() }),
			{ context: { headers: new Headers() } },
		);

		await expect(
			client.extract({ type: "cover_page", text: "tiny" }),
		).rejects.toBeDefined();
		await expect(
			client.extract({ type: "cover_page", text: "a".repeat(20_001) }),
		).rejects.toBeDefined();
		expect(consumeQuota).not.toHaveBeenCalled();
	});

	test.each([
		10, 20_000,
	])("accepts the %i-character text boundary", async (size) => {
		getSessionMock.mockResolvedValue({ user: { id: "owner-1" }, session: {} });
		const extract = vi.fn().mockResolvedValue({
			type: "index_sheet",
			patch: { entries: [{ name: "Test" }] },
			extractedFieldCount: 1,
			warnings: [],
		});
		const client = createRouterClient(
			createAutofillRouter({
				consumeQuota: vi
					.fn()
					.mockResolvedValue({ allowed: true, remaining: 9, retryAt: null }),
				extract,
			}),
			{ context: { headers: new Headers() } },
		);

		await expect(
			client.extract({ type: "index_sheet", text: "a".repeat(size) }),
		).resolves.toBeDefined();
	});

	test("consumes owner quota then returns extraction without persistence", async () => {
		getSessionMock.mockResolvedValue({ user: { id: "owner-1" }, session: {} });
		const consumeQuota = vi
			.fn()
			.mockResolvedValue({ allowed: true, remaining: 9, retryAt: null });
		const result = {
			type: "index_sheet" as const,
			patch: { entries: [{ name: "Ohm's law" }] },
			extractedFieldCount: 1,
			warnings: [],
		};
		const extract = vi.fn().mockResolvedValue(result);
		const client = createRouterClient(
			createAutofillRouter({ consumeQuota, extract }),
			{
				context: { headers: new Headers() },
			},
		);

		await expect(
			client.extract({ type: "index_sheet", text: "Experiment: Ohm's law" }),
		).resolves.toEqual(result);
		expect(consumeQuota).toHaveBeenCalledWith("owner-1", expect.any(Date));
		expect(extract).toHaveBeenCalledWith(
			"index_sheet",
			"Experiment: Ohm's law",
		);
	});

	test("returns uniform quota, empty-result, and provider errors", async () => {
		getSessionMock.mockResolvedValue({ user: { id: "owner-1" }, session: {} });
		const denied = createRouterClient(
			createAutofillRouter({
				consumeQuota: vi.fn().mockResolvedValue({
					allowed: false,
					remaining: 0,
					retryAt: new Date("2026-07-10T09:00:00.000Z"),
				}),
				extract: vi.fn(),
			}),
			{ context: { headers: new Headers() } },
		);
		await expect(
			denied.extract({
				type: "cover_page",
				text: "A valid amount of pasted text",
			}),
		).rejects.toMatchObject({
			code: "TOO_MANY_REQUESTS",
			message: "AI autofill quota exceeded.",
		});

		const failed = createRouterClient(
			createAutofillRouter({
				consumeQuota: vi
					.fn()
					.mockResolvedValue({ allowed: true, remaining: 9, retryAt: null }),
				extract: vi.fn().mockRejectedValue(new Error("secret upstream detail")),
			}),
			{ context: { headers: new Headers() } },
		);
		await expect(
			failed.extract({
				type: "cover_page",
				text: "A valid amount of pasted text",
			}),
		).rejects.toMatchObject({
			code: "INTERNAL_SERVER_ERROR",
			message: "AI extraction is temporarily unavailable.",
		});
	});

	test.each([
		["success", null],
		["no_meaningful_fields", NoMeaningfulAutofillFieldsError],
		["provider_error", ProviderAutofillError],
	] as const)("records one privacy-safe %s event", async (outcome, ErrorType) => {
		getSessionMock.mockResolvedValue({ user: { id: "owner-1" }, session: {} });
		const usage = {
			provider: "google",
			model: "gemini-3.1-flash-lite",
			inputTokens: 12,
			outputTokens: 4,
		};
		const result = {
			type: "cover_page" as const,
			patch: { instituteName: "A", docType: "B" },
			extractedFieldCount: 2,
			warnings: [],
			usage,
		};
		const extract = ErrorType
			? vi.fn().mockRejectedValue(new ErrorType(usage))
			: vi.fn().mockResolvedValue(result);
		const record = vi.fn().mockResolvedValue(undefined);
		const client = createRouterClient(
			createAutofillRouter({
				consumeQuota: vi
					.fn()
					.mockResolvedValue({ allowed: true, remaining: 9, retryAt: null }),
				extract,
				usageRepository: { record },
			}),
			{ context: { headers: new Headers() } },
		);
		await client
			.extract({ type: "cover_page", text: "private source text" })
			.catch(() => undefined);
		expect(record).toHaveBeenCalledTimes(1);
		const event = record.mock.calls[0]?.[0];
		expect(event).toMatchObject({ ownerId: "owner-1", outcome, ...usage });
		for (const key of ["text", "prompt", "patch"])
			expect(event).not.toHaveProperty(key);
	});
});
