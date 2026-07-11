// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { DashboardView } from "./dashboard-view";

const documents = [
	{
		id: "11111111-1111-4111-8111-111111111111",
		type: "cover_page" as const,
		title: "Lab Report Cover",
		createdAt: new Date("2026-07-08T08:00:00Z"),
		updatedAt: new Date("2026-07-10T08:00:00Z"),
	},
	{
		id: "22222222-2222-4222-8222-222222222222",
		type: "index_sheet" as const,
		title: "Summer Index",
		createdAt: new Date("2026-07-07T08:00:00Z"),
		updatedAt: new Date("2026-07-09T08:00:00Z"),
	},
];

const baseProps = {
	documents,
	isLoading: false,
	error: null,
	onRetry: vi.fn(),
	onDuplicate: vi.fn().mockResolvedValue(undefined),
	onDelete: vi.fn().mockResolvedValue(undefined),
	pendingDuplicateId: null,
	pendingDeleteId: null,
	actionError: null,
};

afterEach(cleanup);

describe("dashboard", () => {
	test("renders mixed documents in API order with type-specific links and dates", () => {
		render(<DashboardView {...baseProps} />);

		const cards = screen.getAllByTestId("document-card");
		expect(within(cards[0]).getByText("Lab Report Cover")).toBeTruthy();
		expect(within(cards[1]).getByText("Summer Index")).toBeTruthy();
		expect(
			screen
				.getByRole("link", { name: "Open Lab Report Cover" })
				.getAttribute("href"),
		).toBe("/cover-page/11111111-1111-4111-8111-111111111111");
		expect(
			screen
				.getByRole("link", { name: "Open Summer Index" })
				.getAttribute("href"),
		).toBe("/index-sheet/22222222-2222-4222-8222-222222222222");
		expect(screen.getByText("Cover Page")).toBeTruthy();
		expect(screen.getByText("Index Sheet")).toBeTruthy();
		expect(screen.getByText(/Jul 10, 2026|10 Jul 2026/)).toBeTruthy();
	});

	test("keeps both new-document actions visible in populated and empty states", () => {
		const { rerender } = render(<DashboardView {...baseProps} />);
		expect(screen.getByRole("link", { name: "New Index Sheet" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "New Cover Page" })).toBeTruthy();
		expect(screen.queryByRole("link", { name: "Browse Presets" })).toBeNull();

		rerender(<DashboardView {...baseProps} documents={[]} />);
		expect(screen.getByText("No saved documents yet")).toBeTruthy();
		expect(screen.getByRole("link", { name: "New Index Sheet" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "New Cover Page" })).toBeTruthy();
	});

	test("renders loading and retryable error states", () => {
		const { rerender } = render(
			<DashboardView {...baseProps} documents={[]} isLoading />,
		);
		expect(screen.getByRole("status").textContent).toContain(
			"Loading documents",
		);

		rerender(
			<DashboardView
				{...baseProps}
				documents={[]}
				error="Documents could not be loaded."
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Try again" }));
		expect(baseProps.onRetry).toHaveBeenCalledOnce();
	});

	test("duplicates a document and exposes pending and error feedback", () => {
		const onDuplicate = vi.fn();
		const { rerender } = render(
			<DashboardView {...baseProps} onDuplicate={onDuplicate} />,
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Duplicate Lab Report Cover" }),
		);
		expect(onDuplicate).toHaveBeenCalledWith(documents[0].id);

		rerender(
			<DashboardView
				{...baseProps}
				pendingDuplicateId={documents[0].id}
				actionError="Could not duplicate document."
			/>,
		);
		expect(
			(
				screen.getByRole("button", {
					name: "Duplicating Lab Report Cover",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
		expect(screen.getByRole("alert").textContent).toContain(
			"Could not duplicate document.",
		);
	});

	test("requires confirmation before permanent deletion and supports cancellation", () => {
		const onDelete = vi.fn();
		render(<DashboardView {...baseProps} onDelete={onDelete} />);

		fireEvent.click(
			screen.getByRole("button", { name: "Delete Lab Report Cover" }),
		);
		expect(screen.getByRole("alertdialog")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(onDelete).not.toHaveBeenCalled();

		fireEvent.click(
			screen.getByRole("button", { name: "Delete Lab Report Cover" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
		expect(onDelete).toHaveBeenCalledWith(documents[0].id);
	});
});
