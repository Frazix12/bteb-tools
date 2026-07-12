import type { QueryClient } from "@tanstack/react-query";
import { orpc } from "#/orpc/client";
import type {
	AdminAiKey,
	AdminDocument,
	AdminUser,
	Page,
	Summary,
	Usage,
} from "./types";
export const adminUsersOptions = (page = 1) => ({
	...orpc.admin.users.list.queryOptions({ input: { page, pageSize: 20 } }),
	select: (data: unknown) => data as Page<AdminUser>,
});
export const adminUsageOptions = (datePage = 1, userPage = 1) => ({
	...orpc.admin.usage.summary.queryOptions({
		input: { datePage, userPage, pageSize: 20 },
	}),
	select: (data: unknown) => data as Usage,
});
export const adminSummaryOptions = () => ({
	...orpc.admin.data.summary.queryOptions({ input: {} }),
	select: (data: unknown) => data as Summary,
});
export const adminAiKeysOptions = () => ({
	...orpc.admin.aiKeys.list.queryOptions({ input: {} }),
	select: (data: unknown) => data as AdminAiKey[],
});
export const adminDocumentsOptions = (page = 1) => ({
	...orpc.admin.data.listDocuments.queryOptions({
		input: { page, pageSize: 20 },
	}),
	select: (data: unknown) => data as Page<AdminDocument>,
});
export const adminPresetsOptions = (page = 1) =>
	orpc.admin.presets.list.queryOptions({ input: { page, pageSize: 20 } });
export async function invalidateAdmin(q: QueryClient) {
	await Promise.all([
		q.invalidateQueries({ queryKey: orpc.admin.users.list.key() }),
		q.invalidateQueries({ queryKey: orpc.admin.usage.summary.key() }),
		q.invalidateQueries({ queryKey: orpc.admin.data.summary.key() }),
		q.invalidateQueries({ queryKey: orpc.admin.data.listDocuments.key() }),
		q.invalidateQueries({ queryKey: orpc.admin.presets.list.key() }),
		q.invalidateQueries({ queryKey: orpc.admin.aiKeys.list.key() }),
	]);
}
export const invalidateAdminUsers = (q: QueryClient) =>
	q.invalidateQueries({ queryKey: orpc.admin.users.list.key() });
export const invalidateAdminUsage = (q: QueryClient) =>
	q.invalidateQueries({ queryKey: orpc.admin.usage.summary.key() });
export const invalidateAdminDocuments = (q: QueryClient) =>
	q.invalidateQueries({ queryKey: orpc.admin.data.listDocuments.key() });
export const invalidateAdminSummary = (q: QueryClient) =>
	q.invalidateQueries({ queryKey: orpc.admin.data.summary.key() });
