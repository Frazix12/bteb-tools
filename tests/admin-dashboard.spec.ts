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
	const ratios = await page.evaluate(() => {
		type Rgb = { red: number; green: number; blue: number; alpha: number };
		const parse = (color: string): Rgb => {
			const canvas = document.createElement("canvas");
			canvas.width = 1;
			canvas.height = 1;
			const context = canvas.getContext("2d");
			if (!context) throw new Error("Canvas color parsing is unavailable");
			context.clearRect(0, 0, 1, 1);
			context.fillStyle = color;
			context.fillRect(0, 0, 1, 1);
			const values = context.getImageData(0, 0, 1, 1).data;
			return {
				red: values[0],
				green: values[1],
				blue: values[2],
				alpha: values[3] / 255,
			};
		};
		const composite = (foreground: Rgb, background: Rgb): Rgb => {
			const alpha =
				foreground.alpha + background.alpha * (1 - foreground.alpha);
			if (alpha === 0) return { red: 0, green: 0, blue: 0, alpha: 0 };
			return {
				red:
					(foreground.red * foreground.alpha +
						background.red * background.alpha * (1 - foreground.alpha)) /
					alpha,
				green:
					(foreground.green * foreground.alpha +
						background.green * background.alpha * (1 - foreground.alpha)) /
					alpha,
				blue:
					(foreground.blue * foreground.alpha +
						background.blue * background.alpha * (1 - foreground.alpha)) /
					alpha,
				alpha,
			};
		};
		const luminance = ({ red, green, blue }: Rgb) => {
			const linear = [red, green, blue].map((channel) => {
				const value = channel / 255;
				return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
			});
			return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
		};
		const read = (element: Element) => {
			const style = getComputedStyle(element);
			let background = parse(style.backgroundColor);
			let ancestor = element.parentElement;
			while (background.alpha < 1 && ancestor) {
				background = composite(
					background,
					parse(getComputedStyle(ancestor).backgroundColor),
				);
				ancestor = ancestor.parentElement;
			}
			if (background.alpha < 1) {
				background = composite(background, {
					red: 255,
					green: 255,
					blue: 255,
					alpha: 1,
				});
			}
			const foreground = composite(parse(style.color), background);
			const values = [luminance(foreground), luminance(background)].sort(
				(a, b) => b - a,
			);
			return (values[0] + 0.05) / (values[1] + 0.05);
		};
		const required = (selector: string) => {
			const element = document.querySelector(selector);
			if (!element) throw new Error(`Missing color target: ${selector}`);
			return element;
		};
		return {
			heading: read(required("h1")),
			metricTitle: read(required('[data-metric] [data-slot="card-title"]')),
			metricDetail: read(required("[data-metric] .text-muted-foreground")),
			sidebarControl: read(required("aside button[aria-pressed]")),
		};
	});
	for (const [target, ratio] of Object.entries(ratios)) {
		expect(ratio, `${target} contrast ratio`).toBeGreaterThanOrEqual(4.5);
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
