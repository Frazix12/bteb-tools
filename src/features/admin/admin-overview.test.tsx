// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { AdminOverview } from "./admin-overview";
import type { AdminAiKey, Summary, Usage } from "./types";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		to,
		...props
	}: React.ComponentProps<"a"> & { to: string }) => (
		<a href={to} {...props}>
			{children}
		</a>
	),
}));

const summary: Summary = {
	users: 21,
	documents: 8,
	presets: 3,
	enabledPresets: 1,
	disabledPresets: 2,
	aiRequests: 34,
};

const usage = {
	totals: { events: 34, inputTokens: 100, outputTokens: 50, costMicros: 12 },
	byModel: [],
	byDate: [],
	byUser: [],
	byOutcome: [],
	datePage: 1,
	userPage: 1,
	pageSize: 20,
	dateTotal: 0,
	userTotal: 0,
} satisfies Usage;

const key = (overrides: Partial<AdminAiKey> = {}): AdminAiKey => ({
	id: "key-1",
	provider: "google",
	label: "Primary",
	maskedSuffix: "1234",
	enabled: true,
	validationStatus: "valid",
	cooldownUntil: null,
	lastCheckedAt: null,
	lastUsedAt: null,
	lastSuccessAt: null,
	lastFailureAt: null,
	failureCode: null,
	failureMessage: null,
	...overrides,
});

afterEach(cleanup);

describe("admin overview", () => {
	test("shows supported metrics and operational shortcuts", () => {
		render(<AdminOverview summary={summary} usage={usage} aiKeys={[key()]} />);
		expect(screen.getByRole("heading", { name: "Overview" })).toBeTruthy();
		expect(
			screen.getByText("21", { selector: "[data-metric='users'] *" }),
		).toBeTruthy();
		expect(
			screen.getByRole("link", { name: /Manage users/ }).getAttribute("href"),
		).toBe("/admin/users");
		for (const [name, href] of [
			[/Manage documents/, "/admin/documents"],
			[/Manage presets/, "/admin/presets"],
			[/Review usage/, "/admin/usage"],
			[/Manage AI keys/, "/admin/ai-keys"],
		] as const) {
			expect(screen.getByRole("link", { name }).getAttribute("href")).toBe(
				href,
			);
		}
		expect(screen.getByText(/1 enabled preset/)).toBeTruthy();
		expect(screen.getByText(/1 AI key/)).toBeTruthy();
		expect(screen.getByText(/All enabled keys are valid/)).toBeTruthy();
	});

	test("explains that no AI keys are configured", () => {
		render(<AdminOverview summary={summary} usage={usage} aiKeys={[]} />);
		expect(screen.getByText(/No AI keys configured/)).toBeTruthy();
	});

	test("reports failed validation without exposing key details", () => {
		render(
			<AdminOverview
				summary={summary}
				usage={usage}
				aiKeys={[
					key({ validationStatus: "invalid", failureMessage: "secret-value" }),
				]}
			/>,
		);
		expect(screen.getByText(/1 key failed validation/)).toBeTruthy();
		expect(screen.queryByText(/secret-value/)).toBeNull();
	});
});
