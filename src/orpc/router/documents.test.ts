import { createRouterClient } from "@orpc/server";
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
