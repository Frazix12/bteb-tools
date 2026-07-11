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
				email: "admin@example.com",
				role: "admin" as const,
				documentCount: 2,
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
	pending: null,
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
					name: "Change role for admin@example.com",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
		expect(screen.getByText("Bootstrap admin")).toBeTruthy();
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
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
		fireEvent.click(screen.getByRole("button", { name: "Disable Lab preset" }));
		expect(props.onTogglePreset).toHaveBeenCalledWith(
			props.presets.items[0],
			false,
		);
		fireEvent.click(screen.getByRole("button", { name: "Delete Lab preset" }));
		expect(screen.getByRole("alertdialog")).toBeTruthy();
	});
});
