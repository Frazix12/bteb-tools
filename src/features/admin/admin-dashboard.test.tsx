// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { BOOTSTRAP_ADMIN_EMAIL_DEFAULT } from "#/config/bootstrap-admin";
import { AdminDashboardView } from "./admin-dashboard";

const props = {
	users: {
		items: [
			{
				id: "bootstrap",
				name: "Owner",
				email: BOOTSTRAP_ADMIN_EMAIL_DEFAULT,
				role: "admin" as const,
				createdAt: new Date("2026-07-01T00:00:00Z"),
				documentCount: 2,
				aiRequests: 3,
				inputTokens: 100,
				outputTokens: 50,
				costMicros: 12500,
			},
			{
				id: "user",
				name: "User",
				email: "user@example.com",
				role: "user" as const,
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
	},
	usage: {
		totals: {
			events: 3,
			inputTokens: 100,
			outputTokens: 50,
			costMicros: 12500,
		},
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
		byOutcome: [{ outcome: "success", events: 3, costMicros: 12500 }],
		datePage: 1,
		userPage: 1,
		pageSize: 20,
		dateTotal: 21,
		userTotal: 21,
	},
	summary: {
		users: 21,
		documents: 2,
		presets: 1,
		enabledPresets: 1,
		disabledPresets: 0,
		aiRequests: 3,
	},
	documents: {
		items: [
			{
				id: "11111111-1111-4111-8111-111111111111",
				title: "Lab report",
				ownerEmail: "user@example.com",
				type: "cover_page" as const,
				updatedAt: new Date(),
			},
		],
		total: 21,
		page: 1,
		pageSize: 20,
	},
	presets: {
		items: [
			{
				id: "22222222-2222-4222-8222-222222222222",
				slug: "lab",
				title: "Lab preset",
				description: "",
				type: "cover_page" as const,
				data: {},
				enabled: true,
			},
		],
		total: 1,
		page: 1,
		pageSize: 20,
	},
	onPage: vi.fn(),
	onUsagePage: vi.fn(),
	onRole: vi.fn(),
	onDeleteDocument: vi.fn(),
	onSavePreset: vi.fn(),
	onTogglePreset: vi.fn(),
	onDeletePreset: vi.fn(),
	bootstrapEmail: BOOTSTRAP_ADMIN_EMAIL_DEFAULT,
	pending: false,
	message: null,
};
afterEach(cleanup);

describe("admin dashboard", () => {
	test("uses structured cards, stat tiles, and table styling", () => {
		render(<AdminDashboardView {...props} />);
		expect(document.querySelectorAll("[data-admin-panel]")).toHaveLength(4);
		expect(
			document.querySelectorAll("[data-admin-stat]").length,
		).toBeGreaterThanOrEqual(4);
		expect(document.querySelectorAll("[data-admin-table]")).toHaveLength(3);
		expect(document.querySelector("[data-admin-actions]")).toBeTruthy();
	});

	test("shows four labeled responsive sections, pagination, cost, and accessible controls", () => {
		render(<AdminDashboardView {...props} />);
		for (const name of ["Users", "AI Usage", "Data", "Presets"])
			expect(screen.getByRole("heading", { name })).toBeTruthy();
		expect(screen.getAllByText("Estimated cost").length).toBeGreaterThan(0);
		expect(screen.getAllByText("$0.0125").length).toBeGreaterThan(0);
		expect(screen.getByRole("columnheader", { name: "Joined" })).toBeTruthy();
		expect(screen.getByText("Jul 1, 2026")).toBeTruthy();
		expect(screen.getByText(/google \/ gemini-test/).textContent).toContain(
			"Unknown input",
		);
		expect(screen.getByText("Date page 1 of 2 · 21 dates")).toBeTruthy();
		expect(screen.getByText(/2026-07-11:/).textContent).toContain(
			"Unknown input / 50 output",
		);
		expect(screen.getByText(/Owner:/).textContent).toContain(
			"100 input / Unknown output",
		);
		expect(screen.getByText("User page 1 of 2 · 21 users")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Next date page" }));
		fireEvent.click(screen.getByRole("button", { name: "Next user page" }));
		expect(props.onUsagePage).toHaveBeenCalledWith("date", 2);
		expect(props.onUsagePage).toHaveBeenCalledWith("user", 2);
		expect(
			screen.getAllByRole("button", { name: "Next page" }).length,
		).toBeGreaterThan(0);
		expect(
			document.querySelectorAll("svg:not([aria-hidden='true'])"),
		).toHaveLength(0);
	});

	test("confirms role changes and protects the bootstrap admin", () => {
		render(<AdminDashboardView {...props} />);
		expect(
			(
				screen.getByRole("button", {
					name: `Change role for ${BOOTSTRAP_ADMIN_EMAIL_DEFAULT}`,
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
		expect(screen.getByText("Bootstrap admin")).toBeTruthy();
		fireEvent.click(
			screen.getByRole("button", { name: "Change role for user@example.com" }),
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Confirm role change" }),
		);
		expect(props.onRole).toHaveBeenCalledWith(props.users.items[1], "admin");
	});

	test("validates preset JSON and confirms destructive actions", () => {
		render(<AdminDashboardView {...props} />);
		fireEvent.click(screen.getByRole("button", { name: "New preset" }));
		fireEvent.change(screen.getByLabelText("Preset data (JSON)"), {
			target: { value: "{" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save preset" }));
		expect(screen.getByRole("alert").textContent).toContain("valid JSON");
		fireEvent.click(screen.getByRole("button", { name: "Delete Lab report" }));
		expect(screen.getByRole("alertdialog")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
		expect(props.onDeleteDocument).toHaveBeenCalledWith(
			props.documents.items[0].id,
		);
		fireEvent.click(screen.getByRole("button", { name: "Disable Lab preset" }));
		expect(props.onTogglePreset).toHaveBeenCalledWith(
			props.presets.items[0],
			false,
		);
		fireEvent.click(screen.getByRole("button", { name: "Delete Lab preset" }));
		expect(screen.getByRole("alertdialog")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
		expect(props.onDeletePreset).toHaveBeenCalledWith(
			props.presets.items[0].id,
		);
	});

	test("disables actions while pending and paginates each list", () => {
		const { rerender } = render(<AdminDashboardView {...props} />);
		for (const button of screen.getAllByRole("button", { name: "Next page" }))
			fireEvent.click(button);
		expect(props.onPage).toHaveBeenCalledWith("users", 2);
		expect(props.onPage).toHaveBeenCalledWith("documents", 2);
		rerender(<AdminDashboardView {...props} pending />);
		expect(
			(screen.getByRole("button", { name: "New preset" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
		expect(
			(
				screen.getByRole("button", {
					name: "Delete Lab report",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
	});

	test("loads all preset fields for editing and exposes non-slug server field errors", () => {
		render(
			<AdminDashboardView
				{...props}
				message={{
					error: true,
					text: "Invalid preset",
					fields: { title: "Title is too long" },
				}}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Edit Lab preset" }));
		expect((screen.getByLabelText("Slug") as HTMLInputElement).value).toBe(
			"lab",
		);
		expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe(
			"Lab preset",
		);
		expect(screen.getByRole("button", { name: "Update preset" })).toBeTruthy();
		expect(screen.getByText("Title is too long")).toBeTruthy();
		expect(
			screen.getByLabelText("Title").getAttribute("aria-describedby"),
		).toBe("preset-title-error");
	});

	test.each([
		{ edit: false },
		{ edit: true },
	])("submits every bound preset field for $edit", ({ edit }) => {
		const onSavePreset = vi.fn();
		render(<AdminDashboardView {...props} onSavePreset={onSavePreset} />);
		fireEvent.click(
			screen.getByRole("button", {
				name: edit ? "Edit Lab preset" : "New preset",
			}),
		);
		fireEvent.change(screen.getByLabelText("Slug"), {
			target: { value: "changed-slug" },
		});
		fireEvent.change(screen.getByLabelText("Title"), {
			target: { value: "Changed title" },
		});
		fireEvent.change(screen.getByLabelText("Description"), {
			target: { value: "Changed description" },
		});
		fireEvent.change(screen.getByLabelText("Type"), {
			target: { value: "index_sheet" },
		});
		fireEvent.click(screen.getByLabelText("Enabled"));
		const data = {
			schemaVersion: 1,
			exportedAt: "2026-07-11T00:00:00.000Z",
			title: "Index",
			rowsPerPage: 10,
			showPageNo: true,
			entries: [],
		};
		fireEvent.change(screen.getByLabelText("Preset data (JSON)"), {
			target: { value: JSON.stringify(data) },
		});
		fireEvent.click(
			screen.getByRole("button", {
				name: edit ? "Update preset" : "Save preset",
			}),
		);
		expect(onSavePreset).toHaveBeenCalledWith(
			{
				slug: "changed-slug",
				title: "Changed title",
				description: "Changed description",
				type: "index_sheet",
				enabled: false,
				data,
			},
			edit ? props.presets.items[0].id : undefined,
		);
	});
});
