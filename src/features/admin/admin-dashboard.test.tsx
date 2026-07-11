// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { AdminDashboardView } from "./admin-dashboard";

const props = {
	users: {
		items: [
			{
				id: "bootstrap",
				name: "Owner",
				email: "root@example.com",
				role: "admin" as const,
				documentCount: 2,
			},
			{
				id: "user",
				name: "User",
				email: "user@example.com",
				role: "user" as const,
				documentCount: 0,
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
		byModel: [],
	},
	summary: { users: 21, documents: 2, presets: 1 },
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
	onRole: vi.fn(),
	onDeleteDocument: vi.fn(),
	onSavePreset: vi.fn(),
	onTogglePreset: vi.fn(),
	onDeletePreset: vi.fn(),
	bootstrapEmail: "root@example.com",
	pending: false,
	message: null,
};
afterEach(cleanup);

describe("admin dashboard", () => {
	test("shows four labeled responsive sections, pagination, cost, and accessible controls", () => {
		render(<AdminDashboardView {...props} />);
		for (const name of ["Users", "AI Usage", "Data", "Presets"])
			expect(screen.getByRole("heading", { name })).toBeTruthy();
		expect(screen.getByText("Estimated cost")).toBeTruthy();
		expect(screen.getByText("$0.0125")).toBeTruthy();
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
					name: "Change role for root@example.com",
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

	test("loads all preset fields for editing and exposes server field errors", () => {
		render(
			<AdminDashboardView
				{...props}
				message={{
					error: true,
					text: "Invalid preset",
					fields: { slug: "Slug already exists" },
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
		expect(screen.getByText("Slug already exists")).toBeTruthy();
	});
});
