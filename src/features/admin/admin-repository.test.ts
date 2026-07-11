import { describe, expect, test, vi } from "vitest";
import { getBootstrapAdminEmail } from "#/config/bootstrap-admin";

vi.mock("#/db", () => ({ db: {} }));

import { createAdminRepository } from "./admin-repository";

describe("admin repository role safety", () => {
	test("no administrator can demote the bootstrap account", async () => {
		const repository = createAdminRepository({
			users: [
				{
					id: "bootstrap",
					email: ` ${getBootstrapAdminEmail().toUpperCase()} `,
					role: "admin",
				},
				{ id: "other", email: "other@example.com", role: "admin" },
			],
		});
		await expect(
			repository.setUserRole("other", "bootstrap", "user"),
		).rejects.toMatchObject({ name: "InvalidRoleTransitionError" });
		expect(
			await repository.setUserRole("other", "other", "user"),
		).toMatchObject({ role: "user" });
	});

	test("reports missing role targets", async () => {
		const repository = createAdminRepository({ users: [] });
		await expect(
			repository.setUserRole("admin", "missing", "user"),
		).rejects.toMatchObject({ name: "AdminTargetNotFoundError" });
	});
});
