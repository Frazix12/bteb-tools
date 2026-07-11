import { expect, test as base } from "@playwright/test";

const userState = process.env.E2E_USER_STORAGE_STATE;
const adminState = process.env.E2E_ADMIN_STORAGE_STATE;

const test = base.extend<{ role: "user" | "admin" }>({
	role: ["user", { option: true }],
	context: async ({ browser, role }, use) => {
		const storageState = role === "admin" ? adminState : userState;
		if (!storageState) {
			throw new Error(
				`E2E_${role.toUpperCase()}_STORAGE_STATE must point to a Better Auth Playwright storage-state fixture`,
			);
		}
		const context = await browser.newContext({ storageState });
		await use(context);
		await context.close();
	},
});

test.describe("ordinary user", () => {
	test("cannot navigate directly to admin", async ({ page }) => {
		await page.goto("/admin");
		await expect(page).toHaveURL(/\/dashboard$/);
		await expect(page.getByRole("heading", { name: "Administration" })).toHaveCount(0);
	});
});

test.describe("admin", () => {
	test.use({ role: "admin" });

	test("sees every administration section", async ({ page }) => {
		await page.goto("/admin");
		for (const name of ["Users", "AI Usage", "Data", "Presets"]) {
			await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
		}
	});

	test("sees public presets seeded in PostgreSQL", async ({ page }) => {
		await page.goto("/presets");
		await expect(page.locator("main article, main [data-slot=card]")).toHaveCount(3);
	});

	for (const path of ["/index-sheet/new", "/cover-page/new"]) {
		test(`${path} action bar omits legacy transfer controls`, async ({ page }) => {
			await page.goto(path);
			await expect(page.getByRole("button", { name: /Import JSON|Export JSON/ })).toHaveCount(0);
			await expect(page.getByRole("button", { name: /Save/ })).toBeVisible();
		});
	}
});
