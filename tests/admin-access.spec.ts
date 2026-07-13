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
	for (const path of [
		"/admin",
		"/admin/users",
		"/admin/usage",
		"/admin/ai-keys",
		"/admin/documents",
		"/admin/presets",
	]) {
		test(`protects ${path}`, async ({ page }) => {
			await page.goto(path);
			await expect(page).toHaveURL(/\/dashboard$/);
			await expect(
				page.getByRole("navigation", { name: "Admin navigation" }),
			).toHaveCount(0);
		});
	}
});

test.describe("admin", () => {
	test.use({ role: "admin" });

	test("sees the administration overview", async ({ page }) => {
		await page.goto("/admin");
		await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
		await expect(page.locator("[data-metric]")).toHaveCount(5);
	});

	test("sees public presets seeded in PostgreSQL", async ({ page }) => {
		await page.goto("/admin/presets");
		for (const [title, slug] of [
			["ISTT Cover Page", "istt-cover-page"],
			["Math Index Sheet", "math-index-sheet"],
			["Physics Index Sheet", "physics-index-sheet"],
		] as const) {
			await expect(page.getByText(title, { exact: true })).toBeVisible();
			await page.getByRole("button", { name: `Edit ${title}` }).click();
			await expect(page.getByLabel("Slug")).toHaveValue(slug);
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
