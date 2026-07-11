import type { QueryClient } from "@tanstack/react-query";
import { orpc } from "#/orpc/client";
export const adminUsersOptions = (page = 1) =>
	orpc.admin.users.list.queryOptions({ input: { page, pageSize: 20 } });
export const adminUsageOptions = (datePage = 1, userPage = 1) =>
	orpc.admin.usage.summary.queryOptions({
		input: { datePage, userPage, pageSize: 20 },
	});
export const adminSummaryOptions = () =>
	orpc.admin.data.summary.queryOptions({ input: {} });
export const adminDocumentsOptions = (page = 1) =>
	orpc.admin.data.listDocuments.queryOptions({ input: { page, pageSize: 20 } });
export const adminPresetsOptions = (page = 1) =>
	orpc.admin.presets.list.queryOptions({ input: { page, pageSize: 20 } });
export async function invalidateAdmin(q: QueryClient) {
	await Promise.all([
		q.invalidateQueries({ queryKey: orpc.admin.users.list.key() }),
		q.invalidateQueries({ queryKey: orpc.admin.usage.summary.key() }),
		q.invalidateQueries({ queryKey: orpc.admin.data.summary.key() }),
		q.invalidateQueries({ queryKey: orpc.admin.data.listDocuments.key() }),
		q.invalidateQueries({ queryKey: orpc.admin.presets.list.key() }),
	]);
}
