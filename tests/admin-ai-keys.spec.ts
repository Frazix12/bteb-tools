import { expect, test as base } from "@playwright/test";
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

test("rotates Gemini keys without rendering plaintext credentials", async ({
	page,
}) => {
	const id = "11111111-1111-4111-8111-111111111111";
	let keys: Array<Record<string, unknown>> = [];
	let secret = "";
	const publicKey = () => ({
		id,
		provider: "google",
		label: "Primary",
		maskedSuffix: secret.slice(-4),
		enabled: true,
		validationStatus: "valid",
		cooldownUntil: null,
		lastCheckedAt: null,
		lastUsedAt: null,
		lastSuccessAt: null,
		lastFailureAt: null,
		failureCode: null,
		failureMessage: null,
	});

	await page.route("**/api/rpc/admin/aiKeys/**", async (route) => {
		const operation = new URL(route.request().url()).pathname.split("/").at(-1);
		const payload = route.request().postDataJSON() as
			| { apiKey?: string; enabled?: boolean }
			| undefined;
		if (payload?.apiKey) secret = payload.apiKey;
		if (operation === "create") keys = [publicKey()];
		if (operation === "replace") keys = [publicKey()];
		if (operation === "setEnabled" && keys[0])
			keys = [{ ...keys[0], enabled: payload?.enabled }];
		if (operation === "validateAll" && keys[0])
			keys = [{ ...keys[0], validationStatus: "invalid", enabled: false }];
		if (operation === "delete") keys = [];
		await route.fulfill({
			contentType: "application/json",
			body: JSON.stringify(
				operation === "list" || operation === "validateAll"
					? keys
					: operation === "delete"
						? { deleted: true }
						: keys[0],
			),
		});
	});

	await page.goto("/admin");
	await page.getByLabel("Key label").fill("Primary");
	await page.getByLabel("New API key").fill("test-secret-1234");
	await page.getByRole("button", { name: "Add key" }).click();
	await expect(page.getByText("••••1234")).toBeVisible();
	await expect(page.getByText("Valid", { exact: true })).toBeVisible();
	await expect(page.getByText("test-secret-1234")).toHaveCount(0);

	await page.getByRole("button", { name: "Disable Primary" }).click();
	await expect(page.getByRole("button", { name: "Enable Primary" })).toBeVisible();
	await page.getByRole("button", { name: "Enable Primary" }).click();
	await page.getByRole("button", { name: "Check all keys" }).click();
	await expect(page.getByText("Invalid", { exact: true })).toBeVisible();

	await page.getByLabel("Replacement key for Primary").fill("replacement-5678");
	await page.getByRole("button", { name: "Replace Primary" }).click();
	await expect(page.getByText("••••5678")).toBeVisible();
	await expect(page.getByText("replacement-5678")).toHaveCount(0);

	await page.getByRole("button", { name: "Delete Primary" }).click();
	await page.getByRole("button", { name: "Delete permanently" }).click();
	await expect(page.getByText("••••5678")).toHaveCount(0);
});
