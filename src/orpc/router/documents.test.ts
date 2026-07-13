import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createRouterClient, type RouterClient } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
	DocumentNotFoundError,
	type DocumentService,
} from "#/features/documents/document-service";

const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));
vi.mock("#/lib/session", () => ({ getSession: getSessionMock }));
vi.mock("#/features/documents/document-repository", () => ({
	drizzleDocumentRepository: {},
}));

import { createDocumentRouter } from "./documents";

const id = "11111111-1111-4111-8111-111111111111";
const indexData = {
	schemaVersion: 1 as const,
	exportedAt: "2026-07-10T08:00:00.000Z",
	title: "INDEX",
	rowsPerPage: 10 as const,
	showPageNo: false,
	entries: [],
};

function service() {
	return {
		list: vi.fn(() => Promise.resolve([])),
		get: vi.fn(() => Promise.reject(new DocumentNotFoundError())),
		create: vi.fn(),
		update: vi.fn(),
		duplicate: vi.fn(),
		remove: vi.fn(),
	} as unknown as DocumentService;
}

describe("document procedures", () => {
	beforeEach(() => getSessionMock.mockReset());

	test("rejects unauthenticated calls before persistence", async () => {
		getSessionMock.mockResolvedValue(null);
		const documentService = service();
		const client = createRouterClient(createDocumentRouter(documentService), {
			context: { headers: new Headers({ cookie: "missing" }) },
		});

		const calls = [
			() => client.list({}),
			() => client.get({ id, type: "index_sheet" }),
			() =>
				client.create({
					type: "index_sheet",
					title: "INDEX",
					data: indexData,
					logoDataUrl: null,
				}),
			() =>
				client.update({
					id,
					type: "index_sheet",
					title: "INDEX",
					data: indexData,
					logoDataUrl: null,
				}),
			() => client.duplicate({ id }),
			() => client.remove({ id }),
		];
		for (const call of calls) {
			await expect(call()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		}
		for (const method of Object.values(documentService)) {
			expect(method).not.toHaveBeenCalled();
		}
		expect(getSessionMock).toHaveBeenCalledWith(expect.any(Headers));
	});

	test("accepts valid document writes", async () => {
		getSessionMock.mockResolvedValue({
			session: { id: "session-1" },
			user: { id: "owner-1", name: "Student" },
		});
		const documentService = service();
		const saved = {
			id,
			ownerId: "owner-1",
			type: "index_sheet" as const,
			title: "INDEX",
			data: indexData,
			logoDataUrl: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		documentService.create = vi.fn(() => Promise.resolve(saved));
		const client = createRouterClient(createDocumentRouter(documentService), {
			context: { headers: new Headers() },
		});

		await expect(
			client.create({
				type: "index_sheet",
				title: "INDEX",
				data: indexData,
				logoDataUrl: null,
			}),
		).resolves.toBe(saved);
		expect(documentService.create).toHaveBeenCalledWith("owner-1", {
			type: "index_sheet",
			title: "INDEX",
			data: indexData,
			logoDataUrl: null,
		});
	});

	test("accepts valid document writes through the RPC transport", async () => {
		getSessionMock.mockResolvedValue({
			session: { id: "session-1" },
			user: { id: "owner-1", name: "Student" },
		});
		const documentService = service();
		const saved = {
			id,
			ownerId: "owner-1",
			type: "index_sheet" as const,
			title: "INDEX",
			data: indexData,
			logoDataUrl: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		documentService.create = vi.fn(() => Promise.resolve(saved));
		const router = createDocumentRouter(documentService);
		const handler = new RPCHandler(router);
		const link = new RPCLink({
			url: "http://localhost/api/rpc",
			fetch: async (request) => {
				const { response } = await handler.handle(request, {
					prefix: "/api/rpc",
					context: { headers: request.headers },
				});
				return response ?? new Response("Not Found", { status: 404 });
			},
		});
		const client: RouterClient<typeof router> = createORPCClient(link);

		await expect(
			client.create({
				type: "index_sheet",
				title: "INDEX",
				data: indexData,
				logoDataUrl: null,
			}),
		).resolves.toEqual(saved);
	});

	test("uses the authenticated owner and returns a uniform not-found error", async () => {
		getSessionMock.mockResolvedValue({
			session: { id: "session-1" },
			user: { id: "owner-1", name: "Student" },
		});
		const documentService = service();
		const client = createRouterClient(createDocumentRouter(documentService), {
			context: { headers: new Headers() },
		});

		await expect(
			client.get({
				id,
				type: "index_sheet",
			}),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
			message: "Document not found.",
		});
		expect(documentService.get).toHaveBeenCalledWith("owner-1", {
			id,
			type: "index_sheet",
		});
	});
});
