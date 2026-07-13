// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { BOOTSTRAP_ADMIN_EMAIL_DEFAULT } from "#/config/bootstrap-admin";
import { DataPanel } from "./data-panel";
import { PresetsPanel } from "./presets-panel";
import type {
	AdminDocument,
	AdminPreset,
	AdminUser,
	Page,
	Summary,
	Usage,
} from "./types";
import { UsagePanel } from "./usage-panel";
import { UsersPanel } from "./users-panel";

afterEach(cleanup);
const users: Page<AdminUser> = {
	items: [
		{
			id: "bootstrap",
			name: "Owner",
			email: BOOTSTRAP_ADMIN_EMAIL_DEFAULT,
			role: "admin",
			createdAt: new Date("2026-07-01T00:00:00Z"),
			documentCount: 2,
			aiRequests: 3,
			inputTokens: 100,
			outputTokens: 50,
			costMicros: 12500,
		},
		{
			id: "other-admin",
			name: "Other",
			email: "admin@example.com",
			role: "admin",
			createdAt: new Date("2026-07-02T00:00:00Z"),
			documentCount: 0,
			aiRequests: 0,
			inputTokens: null,
			outputTokens: null,
			costMicros: 0,
		},
	],
	total: 21,
	page: 1,
	pageSize: 20,
};
const usage: Usage = {
	totals: { events: 3, inputTokens: 100, outputTokens: 50, costMicros: 12500 },
	byModel: [
		{
			provider: "google",
			model: "gemini-test",
			events: 3,
			inputTokens: null,
			outputTokens: 50,
			costMicros: 12500,
		},
	],
	byDate: [
		{
			date: "2026-07-11",
			events: 3,
			inputTokens: null,
			outputTokens: 50,
			costMicros: 12500,
		},
	],
	byUser: [
		{
			ownerId: "bootstrap",
			name: "Owner",
			email: BOOTSTRAP_ADMIN_EMAIL_DEFAULT,
			events: 3,
			inputTokens: 100,
			outputTokens: null,
			costMicros: 12500,
		},
	],
	byOutcome: [],
	datePage: 1,
	userPage: 1,
	pageSize: 20,
	dateTotal: 21,
	userTotal: 21,
};
const summary: Summary = {
	users: 21,
	documents: 2,
	presets: 1,
	enabledPresets: 1,
	disabledPresets: 0,
	aiRequests: 3,
};
const documents: Page<AdminDocument> = {
	items: [
		{
			id: "11111111-1111-4111-8111-111111111111",
			title: "Lab report",
			ownerEmail: "user@example.com",
			type: "cover_page",
			updatedAt: new Date(),
		},
	],
	total: 21,
	page: 1,
	pageSize: 20,
};
const presets: Page<AdminPreset> = {
	items: [],
	total: 0,
	page: 1,
	pageSize: 20,
};
const savedDocuments = [
	{
		id: "22222222-2222-4222-8222-222222222222",
		title: "My index",
		type: "index_sheet" as const,
		data: {
			schemaVersion: 1 as const,
			exportedAt: "2026-07-10T08:00:00.000Z",
			title: "Index title",
			rowsPerPage: 10 as const,
			showPageNo: true,
			entries: [],
		},
	},
];

describe("admin core panels", () => {
	test("protects only the configured bootstrap admin and owns users pagination", () => {
		const onRole = vi.fn();
		const onPage = vi.fn();
		render(
			<UsersPanel
				data={users}
				bootstrapEmail={BOOTSTRAP_ADMIN_EMAIL_DEFAULT}
				pending={false}
				onRole={onRole}
				onPage={onPage}
			/>,
		);
		expect(
			(
				screen.getByRole("button", {
					name: `Change role for ${BOOTSTRAP_ADMIN_EMAIL_DEFAULT}`,
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
		expect(
			(
				screen.getByRole("button", {
					name: "Change role for admin@example.com",
				}) as HTMLButtonElement
			).disabled,
		).toBe(false);
		fireEvent.click(
			screen.getByRole("button", { name: "Change role for admin@example.com" }),
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Confirm role change" }),
		);
		expect(onRole).toHaveBeenCalledWith(users.items[1], "user");
		fireEvent.click(screen.getByRole("button", { name: "Next page" }));
		expect(onPage).toHaveBeenCalledWith("users", 2);
	});
	test("formats usage cost and paginates date and user independently", () => {
		const onPage = vi.fn();
		render(<UsagePanel data={usage} pending={false} onPage={onPage} />);
		expect(screen.getAllByText("$0.0125").length).toBeGreaterThan(0);
		expect(screen.getByText("Date page 1 of 2 · 21 dates")).toBeTruthy();
		expect(screen.getByText("User page 1 of 2 · 21 users")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Next date page" }));
		fireEvent.click(screen.getByRole("button", { name: "Next user page" }));
		expect(onPage).toHaveBeenCalledWith("date", 2);
		expect(onPage).toHaveBeenCalledWith("user", 2);
	});
	test("confirms document deletion and paginates documents", () => {
		const onDelete = vi.fn();
		const onPage = vi.fn();
		render(
			<DataPanel
				summary={summary}
				data={documents}
				pending={false}
				onDelete={onDelete}
				onPage={onPage}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Delete Lab report" }));
		fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
		expect(onDelete).toHaveBeenCalledWith(documents.items[0].id);
		fireEvent.click(screen.getByRole("button", { name: "Next page" }));
		expect(onPage).toHaveBeenCalledWith("documents", 2);
	});
	test("imports an admin's saved document into the preset form", () => {
		render(
			<PresetsPanel
				data={presets}
				savedDocuments={savedDocuments}
				pending={false}
				message={null}
				onSave={vi.fn()}
				onToggle={vi.fn()}
				onDelete={vi.fn()}
				onPage={vi.fn()}
			/>,
		);
		fireEvent.change(screen.getByLabelText("Import saved document"), {
			target: { value: savedDocuments[0].id },
		});
		expect(screen.getByLabelText("Title")).toHaveProperty("value", "My index");
		expect(screen.getByLabelText("Type")).toHaveProperty(
			"value",
			"index_sheet",
		);
		expect(screen.getByLabelText("Preset data (JSON)")).toHaveProperty(
			"value",
			JSON.stringify(savedDocuments[0].data, null, 2),
		);
	});
});
