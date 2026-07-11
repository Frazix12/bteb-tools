import { beforeEach, describe, expect, test, vi } from "vitest";

import { getBootstrapAdminEmail } from "#/config/bootstrap-admin";

const { dbMock } = vi.hoisted(() => ({
	dbMock: { transaction: vi.fn(), select: vi.fn() },
}));
vi.mock("#/db", () => ({ db: dbMock }));

import {
	createAdminRepository,
	drizzleAdminRepository,
} from "./admin-repository";

describe("admin repository", () => {
	beforeEach(() => vi.clearAllMocks());
	test("protects only the bootstrap admin from self-demotion", async () => {
		const repository = createAdminRepository({
			users: [
				{
					id: "bootstrap",
					email: ` ${getBootstrapAdminEmail().toUpperCase()} `,
					role: "admin",
				},
				{ id: "ordinary", email: "admin@example.com", role: "admin" },
			],
		});
		await expect(
			repository.setUserRole("bootstrap", "bootstrap", "user"),
		).rejects.toMatchObject({ name: "InvalidRoleTransitionError" });
		await expect(
			repository.setUserRole("ordinary", "ordinary", "user"),
		).resolves.toMatchObject({ role: "user" });
	});

	test("loads target identity and updates the role in one transaction", async () => {
		const returning = vi
			.fn()
			.mockResolvedValue([{ id: "ordinary", role: "user" }]);
		const whereUpdate = vi.fn(() => ({ returning }));
		const set = vi.fn(() => ({ where: whereUpdate }));
		const update = vi.fn(() => ({ set }));
		const limit = vi
			.fn()
			.mockResolvedValue([{ id: "ordinary", email: "admin@example.com" }]);
		const whereSelect = vi.fn(() => ({ limit }));
		const from = vi.fn(() => ({ where: whereSelect }));
		const select = vi.fn(() => ({ from }));
		dbMock.transaction.mockImplementation(async (callback) =>
			callback({ select, update }),
		);

		await expect(
			drizzleAdminRepository.setUserRole("ordinary", "ordinary", "user"),
		).resolves.toEqual({ id: "ordinary", role: "user" });
		expect(select).toHaveBeenCalledOnce();
		expect(update).toHaveBeenCalledOnce();
	});

	test("returns usage totals and provider/model cost breakdown", async () => {
		const totals = {
			events: 3,
			inputTokens: "10",
			outputTokens: "5",
			costMicros: "12",
		};
		const byModel = [{ provider: "openai", model: "gpt", ...totals }];
		dbMock.select
			.mockReturnValueOnce({ from: vi.fn().mockResolvedValue([totals]) })
			.mockReturnValueOnce({
				from: vi.fn(() => ({
					groupBy: vi.fn(() => ({
						orderBy: vi.fn().mockResolvedValue(byModel),
					})),
				})),
			});

		await expect(drizzleAdminRepository.usageSummary()).resolves.toEqual({
			totals,
			byModel,
		});
		expect(dbMock.select).toHaveBeenCalledTimes(2);
	});
});
