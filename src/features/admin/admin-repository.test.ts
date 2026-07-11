import { describe, expect, test, vi } from "vitest";

vi.mock("#/db", () => ({ db: {} }));

import { createAdminRepository } from "./admin-repository";

describe("admin repository", () => {
	test("protects the bootstrap admin from self-demotion", async () => {
		const repository = createAdminRepository({ users: [{ id: "bootstrap", role: "admin" }] });
		await expect(repository.setUserRole("bootstrap", "bootstrap", "user")).rejects.toMatchObject({ name: "InvalidRoleTransitionError" });
	});
});
