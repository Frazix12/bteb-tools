import { beforeEach, describe, expect, test, vi } from "vitest";

import { getBootstrapAdminEmail } from "#/config/bootstrap-admin";

const { dbMock } = vi.hoisted(() => ({
	dbMock: {
		transaction: vi.fn(),
		select: vi.fn(),
		insert: vi.fn(),
		update: vi.fn(),
	},
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

	test("maps user aggregates and applies pagination", async () => {
		const rows = [
			{
				id: "u",
				name: "User",
				email: "u@example.com",
				role: "user",
				createdAt: new Date(),
				documentCount: 2,
			},
		];
		const offset = vi.fn().mockResolvedValue(rows);
		const limit = vi.fn(() => ({ offset }));
		const orderBy = vi.fn(() => ({ limit }));
		const groupBy = vi.fn(() => ({ orderBy }));
		const leftJoin = vi.fn(() => ({ groupBy }));
		dbMock.select
			.mockReturnValueOnce({ from: vi.fn(() => ({ leftJoin })) })
			.mockReturnValueOnce({ from: vi.fn().mockResolvedValue([{ value: 7 }]) });

		await expect(
			drizzleAdminRepository.listUsers({ page: 3, pageSize: 2 }),
		).resolves.toEqual({ items: rows, total: 7, page: 3, pageSize: 2 });
		expect(limit).toHaveBeenCalledWith(2);
		expect(offset).toHaveBeenCalledWith(4);
	});

	test("returns data counts", async () => {
		dbMock.select
			.mockReturnValueOnce({ from: vi.fn().mockResolvedValue([{ count: 4 }]) })
			.mockReturnValueOnce({ from: vi.fn().mockResolvedValue([{ count: 5 }]) })
			.mockReturnValueOnce({ from: vi.fn().mockResolvedValue([{ count: 6 }]) });
		await expect(drizzleAdminRepository.dataSummary()).resolves.toEqual({
			users: 4,
			documents: 5,
			presets: 6,
		});
	});

	test("maps document DTOs and applies pagination", async () => {
		const items = [
			{
				id: "doc",
				ownerId: "u",
				ownerName: "User",
				ownerEmail: "u@example.com",
				type: "index_sheet",
				title: "Index",
			},
		];
		const offset = vi.fn().mockResolvedValue(items);
		const limit = vi.fn(() => ({ offset }));
		const orderBy = vi.fn(() => ({ limit }));
		const innerJoin = vi.fn(() => ({ orderBy }));
		dbMock.select
			.mockReturnValueOnce({ from: vi.fn(() => ({ innerJoin })) })
			.mockReturnValueOnce({ from: vi.fn().mockResolvedValue([{ value: 8 }]) });
		await expect(
			drizzleAdminRepository.listDocuments({ page: 2, pageSize: 3 }),
		).resolves.toEqual({ items, total: 8, page: 2, pageSize: 3 });
		expect(limit).toHaveBeenCalledWith(3);
		expect(offset).toHaveBeenCalledWith(3);
	});

	test.each([
		[true],
		[false],
	])("deletes a document transactionally (found: %s)", async (found) => {
		const returning = vi.fn().mockResolvedValue(found ? [{ id: "doc" }] : []);
		const where = vi.fn(() => ({ returning }));
		const remove = vi.fn(() => ({ where }));
		dbMock.transaction.mockImplementation(async (callback) =>
			callback({ delete: remove }),
		);
		const result = drizzleAdminRepository.deleteDocument(
			"11111111-1111-4111-8111-111111111111",
		);
		if (found) await expect(result).resolves.toBeUndefined();
		else
			await expect(result).rejects.toMatchObject({
				name: "AdminTargetNotFoundError",
			});
		expect(remove).toHaveBeenCalledOnce();
	});

	test("lists presets with pagination and attributes preset writes", async () => {
		const items = [{ id: "preset", slug: "index", enabled: true }];
		const offset = vi.fn().mockResolvedValue(items);
		const limit = vi.fn(() => ({ offset }));
		const orderBy = vi.fn(() => ({ limit }));
		dbMock.select
			.mockReturnValueOnce({ from: vi.fn(() => ({ orderBy })) })
			.mockReturnValueOnce({ from: vi.fn().mockResolvedValue([{ value: 1 }]) });
		await expect(
			drizzleAdminRepository.listPresets({ page: 2, pageSize: 4 }),
		).resolves.toEqual({ items, total: 1, page: 2, pageSize: 4 });
		expect(offset).toHaveBeenCalledWith(4);

		const write = {
			slug: "index",
			title: "Index",
			description: "",
			type: "index_sheet" as const,
			data: {},
			enabled: true,
		};
		const returning = vi.fn().mockResolvedValue([{ id: "preset" }]);
		const values = vi.fn(() => ({ returning }));
		dbMock.insert.mockReturnValue({ values });
		await drizzleAdminRepository.createPreset(write, "admin");
		expect(values).toHaveBeenCalledWith({
			...write,
			createdBy: "admin",
			updatedBy: "admin",
		});

		const updateReturning = vi.fn().mockResolvedValue([{ id: "preset" }]);
		const where = vi.fn(() => ({ returning: updateReturning }));
		const set = vi.fn(() => ({ where }));
		dbMock.update.mockReturnValue({ set });
		await drizzleAdminRepository.updatePreset(
			"11111111-1111-4111-8111-111111111111",
			write,
			"editor",
		);
		expect(set).toHaveBeenCalledWith(
			expect.objectContaining({
				...write,
				updatedBy: "editor",
				updatedAt: expect.any(Date),
			}),
		);
		await drizzleAdminRepository.setPresetEnabled(
			"11111111-1111-4111-8111-111111111111",
			false,
			"editor",
		);
		expect(set).toHaveBeenLastCalledWith({
			enabled: false,
			updatedBy: "editor",
			updatedAt: expect.any(Date),
		});
	});

	test("maps duplicate and missing preset writes", async () => {
		const write = {
			slug: "index",
			title: "Index",
			description: "",
			type: "index_sheet" as const,
			data: {},
			enabled: true,
		};
		dbMock.insert.mockReturnValue({
			values: vi.fn(() => ({
				returning: vi.fn().mockRejectedValue({ code: "23505" }),
			})),
		});
		await expect(
			drizzleAdminRepository.createPreset(write, "admin"),
		).rejects.toMatchObject({ name: "DuplicatePresetSlugError" });
		const returning = vi.fn().mockResolvedValue([]);
		dbMock.update.mockReturnValue({
			set: vi.fn(() => ({ where: vi.fn(() => ({ returning })) })),
		});
		await expect(
			drizzleAdminRepository.updatePreset(
				"11111111-1111-4111-8111-111111111111",
				write,
				"admin",
			),
		).rejects.toMatchObject({ name: "AdminTargetNotFoundError" });
		await expect(
			drizzleAdminRepository.setPresetEnabled(
				"11111111-1111-4111-8111-111111111111",
				true,
				"admin",
			),
		).rejects.toMatchObject({ name: "AdminTargetNotFoundError" });
	});

	test.each([
		[true],
		[false],
	])("deletes a preset transactionally (found: %s)", async (found) => {
		const returning = vi
			.fn()
			.mockResolvedValue(found ? [{ id: "preset" }] : []);
		const remove = vi.fn(() => ({ where: vi.fn(() => ({ returning })) }));
		dbMock.transaction.mockImplementation(async (callback) =>
			callback({ delete: remove }),
		);
		const result = drizzleAdminRepository.deletePreset(
			"11111111-1111-4111-8111-111111111111",
		);
		if (found) await expect(result).resolves.toBeUndefined();
		else
			await expect(result).rejects.toMatchObject({
				name: "AdminTargetNotFoundError",
			});
		expect(remove).toHaveBeenCalledOnce();
	});
});
