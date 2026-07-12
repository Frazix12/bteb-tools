import { describe, expect, test, vi } from "vitest";

const keys = {
	users: ["users"],
	usage: ["usage"],
	documents: ["documents"],
	summary: ["summary"],
};
vi.mock("#/orpc/client", () => ({
	orpc: {
		admin: {
			users: { list: { key: () => keys.users, queryOptions: vi.fn() } },
			usage: { summary: { key: () => keys.usage, queryOptions: vi.fn() } },
			data: {
				listDocuments: { key: () => keys.documents, queryOptions: vi.fn() },
				summary: { key: () => keys.summary, queryOptions: vi.fn() },
			},
			presets: { list: { key: vi.fn(), queryOptions: vi.fn() } },
			aiKeys: { list: { key: vi.fn(), queryOptions: vi.fn() } },
		},
	},
}));

import {
	invalidateAdminDocuments,
	invalidateAdminSummary,
	invalidateAdminUsage,
	invalidateAdminUsers,
} from "./admin-queries";

describe("targeted admin invalidation", () => {
	test.each([
		["users", invalidateAdminUsers, keys.users],
		["usage", invalidateAdminUsage, keys.usage],
		["documents", invalidateAdminDocuments, keys.documents],
		["summary", invalidateAdminSummary, keys.summary],
	] as const)("invalidates only %s", async (_, invalidate, queryKey) => {
		const queryClient = { invalidateQueries: vi.fn(async () => undefined) };
		await invalidate(queryClient as never);
		expect(queryClient.invalidateQueries).toHaveBeenCalledOnce();
		expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey });
	});
});
