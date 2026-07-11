import { expect, test as base } from "@playwright/test";
import { AUTH_FIXTURE } from "./auth-fixture";

const test = base.extend<{ role: "user" | "admin" }>({
	role: ["user", { option: true }],
	context: async ({ browser, role }, use) => {
		const storageState =
			role === "admin" ? AUTH_FIXTURE.adminState : AUTH_FIXTURE.userState;
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
		for (const title of [
			"ISTT Cover Page",
			"Math Index Sheet",
			"Physics Index Sheet",
		]) {
			await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
		}
		for (const slug of [
			"istt-cover-page",
			"math-index-sheet",
			"physics-index-sheet",
		]) {
			await expect(page.locator(`a[href*="preset=${slug}"]`)).toHaveCount(1);
		}
	});

	for (const path of ["/index-sheet/new", "/cover-page/new"]) {
		test(`${path} action bar omits legacy transfer controls`, async ({ page }) => {
			await page.goto(path);
			await expect(page.getByRole("button", { name: /Import JSON|Export JSON/ })).toHaveCount(0);
			await expect(page.getByRole("button", { name: /Save/ })).toBeVisible();
		});
	}
});
