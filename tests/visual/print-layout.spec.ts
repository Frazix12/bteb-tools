import { expect, test } from "@playwright/test";

const A4_WIDTH = 210 * (96 / 25.4);
const A4_HEIGHT = 297 * (96 / 25.4);

for (const kind of ["index", "cover"] as const) {
	test(`${kind} preview prints at the A4 origin`, async ({ page }) => {
		await page.goto(`/visual-fixtures?kind=${kind}`);
		await page.evaluate(() => document.fonts.ready);
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
