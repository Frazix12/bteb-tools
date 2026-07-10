import { devices, expect, test } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const A4_WIDTH = 210 * (96 / 25.4);
const A4_HEIGHT = 297 * (96 / 25.4);

const RESPONSIVE_VIEWPORTS = [
	{ height: 844, width: 390 },
	{ height: 390, width: 844 },
	{ height: 768, width: 1024 },
	{ height: 900, width: 1440 },
] as const;

for (const viewport of RESPONSIVE_VIEWPORTS) {
	test(`index preview fits ${viewport.width}x${viewport.height} without overflowing`, async ({
		page,
	}) => {
		await page.setViewportSize(viewport);
		await page.goto("/visual-fixtures?kind=index&stress=true");
		await page.evaluate(() => document.fonts.ready);
		await expect(page.locator(".page-frame")).toHaveCount(2);

		await expect
			.poll(() =>
				page.evaluate(() => {
					const host = document.querySelector<HTMLElement>("[data-preview-host]");
					if (!host) return false;
					const hostBox = host.getBoundingClientRect();
					const availableHeight = window.innerHeight - hostBox.top;
					return Array.from(
						document.querySelectorAll<HTMLElement>(".page-frame"),
					).every((frame) => {
						const box = frame.getBoundingClientRect();
						return (
							box.left >= hostBox.left &&
							box.right <= hostBox.right &&
							box.height <= availableHeight
						);
					});
				}),
			{ timeout: 15_000 },
		)
			.toBe(true);

		await expect(page.locator("sup").first()).toContainText("2");
		const namesFit = await page.locator(".idx-cell.name").evaluateAll((cells) =>
			cells.every((cell) => cell.scrollHeight <= cell.clientHeight),
		);
		expect(namesFit).toBe(true);
	});
}

for (const kind of ["index", "cover"] as const) {
	test(`${kind} preview prints at the A4 origin`, async ({ page }) => {
		await page.goto(`/visual-fixtures?kind=${kind}`);
		await page.evaluate(() => document.fonts.ready);
		const fontFamilies = await page.evaluate(() =>
			Array.from(document.fonts, (font) => font.family),
		);
		expect(fontFamilies).toContain("Noto Sans");
		expect(fontFamilies).toContain("Noto Sans Bengali");
		expect(fontFamilies).toContain("Kalpurush");
		await page.emulateMedia({ media: "print" });
		const frame = page.locator(".page-frame").first();
		const box = await frame.boundingBox();
		expect(box).not.toBeNull();
		expect(box?.x).toBeCloseTo(0, 0);
		expect(box?.y).toBeCloseTo(0, 0);
		expect(box?.width).toBeCloseTo(A4_WIDTH, 0);
		expect(box?.height).toBeCloseTo(A4_HEIGHT, 0);
		await expect(page.locator("[data-preview-host]")).toHaveCSS("padding", "0px");
		await expect(frame).toHaveScreenshot(`${kind}-a4.png`, {
			animations: "disabled",
			maxDiffPixelRatio: 0,
		});
	});
}

test("index pagination advances by one exact A4 page", async ({ page }) => {
	await page.goto("/visual-fixtures?kind=index");
	await page.emulateMedia({ media: "print" });
	const boxes = await page.locator(".page-frame").evaluateAll((frames) =>
		frames.map((frame) => frame.getBoundingClientRect().toJSON()),
	);
	expect(boxes).toHaveLength(2);
	expect(boxes[1].y - boxes[0].y).toBeCloseTo(A4_HEIGHT, 0);
});

test("index output matches the migrated static reference", async ({
	browser,
	}) => {
	const entries = Array.from({ length: 11 }, (_, index) => ({
		name:
			index === 0
				? "ডিজিটাল ইলেকট্রনিক্স পরীক্ষণ ও mixed-script measurement"
				: `Experiment ${index + 1}`,
		issueDate: "2026-07-01",
		submitDate: "2026-07-10",
		pageNo: String(index + 2),
	}));
	const context = await browser.newContext({ ...devices["Desktop Chrome"] });
	const legacy = await context.newPage();
	await legacy.goto(
		`file://${process.cwd()}/Refrence/index.html`,
	);
	await legacy.locator("#importFile").setInputFiles({
		name: "index.json",
		mimeType: "application/json",
		buffer: Buffer.from(
			JSON.stringify({
				title: "INDEX",
				rowsPerPage: 10,
				showPageNo: true,
				entries,
			}),
		),
	});
	await legacy.evaluate(() => document.fonts.ready);
	await legacy.emulateMedia({ media: "print" });
	const legacyImage = await legacy
		.locator("#previewWrap .page-frame")
		.first()
		.screenshot({ animations: "disabled" });

	const migrated = await context.newPage();
	await migrated.goto("http://127.0.0.1:3000/visual-fixtures?kind=index");
	await migrated.evaluate(() => document.fonts.ready);
	await migrated.emulateMedia({ media: "print" });
	const migratedImage = await migrated
		.locator(".page-frame")
		.first()
		.screenshot({ animations: "disabled" });

	const legacyPng = PNG.sync.read(legacyImage);
	const migratedPng = PNG.sync.read(migratedImage);
	expect([migratedPng.width, migratedPng.height]).toEqual([
		legacyPng.width,
		legacyPng.height,
	]);
	const differentPixels = pixelmatch(
		legacyPng.data,
		migratedPng.data,
		undefined,
		legacyPng.width,
		legacyPng.height,
		{ includeAA: false, threshold: 0.1 },
	);
	expect(differentPixels / (legacyPng.width * legacyPng.height)).toBeLessThan(
		0.01,
	);
	await context.close();
});
