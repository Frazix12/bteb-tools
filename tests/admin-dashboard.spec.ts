import { expect, test as base, type Page } from "@playwright/test";
import { AUTH_FIXTURE } from "./auth-fixture";

const test = base.extend({
	context: async ({ browser }, use) => {
		const context = await browser.newContext({
			storageState: AUTH_FIXTURE.adminState,
		});
		await use(context);
		await context.close();
	},
});

const destinations = [
	["Overview", "/admin"],
	["Users", "/admin/users"],
	["Usage", "/admin/usage"],
	["AI keys", "/admin/ai-keys"],
	["Documents", "/admin/documents"],
	["Presets", "/admin/presets"],
] as const;

async function assertReadableColors(page: Page) {
	const colors = await page.evaluate(() => {
		const read = (element: Element) => {
			const style = getComputedStyle(element);
			let background = style.backgroundColor;
			let ancestor = element.parentElement;
			while (background === "rgba(0, 0, 0, 0)" && ancestor) {
				background = getComputedStyle(ancestor).backgroundColor;
				ancestor = ancestor.parentElement;
			}
			return { background, foreground: style.color };
		};
		const required = (selector: string) => {
			const element = document.querySelector(selector);
			if (!element) throw new Error(`Missing color target: ${selector}`);
			return element;
		};
		return [
			read(document.body),
			read(required("[data-metric]")),
			read(required("aside")),
			read(required("h1")),
		];
	});
	for (const { background, foreground } of colors) {
		expect(background).not.toBe("rgba(0, 0, 0, 0)");
		expect(foreground).not.toBe("rgba(0, 0, 0, 0)");
		expect(foreground).not.toBe(background);
	}
}

test("navigates every desktop administration destination", async ({ page }) => {
	await page.goto("/admin");
	await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
	await expect(page.getByRole("navigation", { name: "Primary navigation" })).toHaveCount(0);

	for (const [label, path] of destinations) {
		const link = page
			.getByRole("navigation", { name: "Admin navigation" })
			.getByRole("link", { name: label, exact: true });
		await link.click();
		await expect(page).toHaveURL(new RegExp(`${path.replaceAll("/", "\\/")}$`));
		await expect(link).toHaveAttribute("aria-current", "page");
	}

	await page.getByRole("link", { name: "Back to site" }).click();
	await expect(page).toHaveURL(/\/dashboard$/);
});

test("uses and dismisses the mobile administration drawer", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/admin");
	const dialog = page.getByRole("dialog", { name: "Administration" });
	await expect
		.poll(async () => {
			if (!(await dialog.isVisible())) {
				await page
					.getByRole("button", { name: "Open admin navigation" })
					.click();
			}
			return dialog.isVisible();
		})
		.toBe(true);
	await expect
		.poll(() =>
			dialog.evaluate((element) => element.contains(document.activeElement)),
		)
		.toBe(true);
	await dialog.getByRole("link", { name: "Users" }).click();
	await expect(page).toHaveURL(/\/admin\/users$/);
	await expect(dialog).toBeHidden();

	await page.getByRole("button", { name: "Open admin navigation" }).click();
	await expect(dialog).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(dialog).toBeHidden();
});

test("persists explicit themes and resolves system mode", async ({ page }) => {
	const hydrationErrors: string[] = [];
	page.on("console", (message) => {
		if (
			message.type() === "error" &&
			message.text().includes("hydrated but some attributes")
		) {
			hydrationErrors.push(message.text());
		}
	});
	await page.goto("/admin");
	for (const mode of ["Dark", "Light"] as const) {
		const button = page.getByRole("button", { name: mode, exact: true });
		await expect
			.poll(async () => {
				if ((await button.getAttribute("aria-pressed")) !== "true") {
					await button.click();
				}
				return button.getAttribute("aria-pressed");
			})
			.toBe("true");
		await page.reload();
		const expected = mode.toLowerCase();
		await expect(
			page.getByRole("button", { name: mode, exact: true }),
		).toHaveAttribute("aria-pressed", "true");
		await expect(page.locator("html")).toHaveClass(new RegExp(expected));
		await expect(page.locator("html")).toHaveAttribute("data-theme", expected);
		await expect
			.poll(() => page.locator("html").evaluate((root) => root.style.colorScheme))
			.toBe(expected);
		await expect(page.locator("[data-metric]")).toHaveCount(5);
		await assertReadableColors(page);
	}

	await page.emulateMedia({ colorScheme: "dark" });
	await page.getByRole("button", { name: "System", exact: true }).click();
	await expect(page.locator("html")).toHaveAttribute("data-theme", "system");
	await expect(page.locator("html")).toHaveClass(/dark/);
	await expect.poll(() => page.evaluate(() => localStorage.getItem("theme"))).toBe("system");
	await page.emulateMedia({ colorScheme: "light" });
	await expect(page.locator("html")).toHaveClass(/light/);
	await expect(page.locator("html")).toHaveAttribute("data-theme", "system");
	expect(hydrationErrors).toEqual([]);
});
