// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { createBlankIndexSheet } from "./defaults";
import { IndexSheetEditor } from "./index-sheet-editor";

afterEach(cleanup);

const renderEditor = (overrides = {}) => {
	const props = {
		initialData: createBlankIndexSheet(),
		onSave: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
	return { ...render(<IndexSheetEditor {...props} />), props };
};

describe("index sheet editor", () => {
	test("adds validated rows and keeps the ten-row preview live", () => {
		renderEditor();
		fireEvent.click(screen.getByRole("button", { name: "Add row" }));
		expect(screen.getByText("Experiment name is required.")).toBeTruthy();

		fireEvent.change(screen.getByLabelText("Experiment name"), {
			target: { value: "Photosynthesis" },
		});
		fireEvent.change(screen.getByLabelText("Issue date"), {
			target: { value: "2026-07-10" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Add row" }));

		expect(screen.getByText("1 row added")).toBeTruthy();
		expect(screen.getAllByText("Photosynthesis").length).toBeGreaterThan(1);
		expect(
			screen
				.getByTestId("index-preview-page")
				.querySelectorAll(".idx-body .idx-row"),
		).toHaveLength(10);
		expect(screen.getByText("10/07/26")).toBeTruthy();
	});

	test("requires a page number only while its column is enabled", () => {
		renderEditor();
		fireEvent.click(screen.getByRole("switch", { name: /Include a Page No/ }));
		fireEvent.change(screen.getByLabelText("Experiment name"), {
			target: { value: "A row" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Add row" }));
		expect(screen.getByText("Page number is required.")).toBeTruthy();

		fireEvent.change(screen.getByLabelText("Page no."), {
			target: { value: "1-4" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Add row" }));
		expect(
			screen.getByText(
				(_, element) =>
					element?.classList.contains("idx-cell") === true &&
					element.textContent === "PageNo.",
			),
		).toBeTruthy();
		expect(screen.getByText("1-4")).toBeTruthy();
		expect(screen.getByText(/p\.1-4/)).toBeTruthy();
	});

	test("edits, cancels, and deletes rows without losing the draft", () => {
		renderEditor({
			initialData: {
				...createBlankIndexSheet(),
				entries: [
					{ name: "Original", pageNo: "", issueDate: "", submitDate: "" },
				],
			},
		});
		fireEvent.click(screen.getByRole("button", { name: "Edit Original" }));
		fireEvent.change(screen.getByLabelText("Experiment name"), {
			target: { value: "Changed" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Cancel edit" }));
		expect(screen.queryByText("Changed")).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "Edit Original" }));
		fireEvent.change(screen.getByLabelText("Experiment name"), {
			target: { value: "Changed" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Update row" }));
		expect(screen.getAllByText("Changed").length).toBeGreaterThan(1);
		fireEvent.click(screen.getByRole("button", { name: "Delete Changed" }));
		expect(screen.getByText(/No rows yet/)).toBeTruthy();
	});

	test("imports valid legacy JSON, rejects invalid JSON, and exports the exact draft", async () => {
		const onExport = vi.fn();
		renderEditor({ onExport });
		const input = screen.getByLabelText("Import JSON file");
		const imported = {
			schemaVersion: 1,
			exportedAt: "2026-07-10T00:00:00.000Z",
			title: "Imported",
			rowsPerPage: 10,
			showPageNo: false,
			entries: [
				{ name: "Imported row", issueDate: "", submitDate: "", pageNo: "" },
			],
		};
		fireEvent.change(input, {
			target: {
				files: [
					new File([JSON.stringify(imported)], "ok.json", {
						type: "application/json",
					}),
				],
			},
		});
		expect(await screen.findByDisplayValue("Imported")).toBeTruthy();

		fireEvent.change(input, {
			target: {
				files: [new File(["nope"], "bad.json", { type: "application/json" })],
			},
		});
		expect((await screen.findByRole("alert")).textContent).toContain(
			"Could not read",
		);

		fireEvent.click(screen.getByRole("button", { name: "Export JSON" }));
		expect(onExport).toHaveBeenCalledWith(
			expect.objectContaining({ title: "Imported", entries: imported.entries }),
		);
	});

	test("saves the current draft, exposes failures, prints, and reports dirty state", async () => {
		const onSave = vi.fn().mockRejectedValue(new Error("Save unavailable"));
		const onDirtyChange = vi.fn();
		const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
		renderEditor({ onSave, onDirtyChange });
		fireEvent.change(screen.getByLabelText("Sheet title"), {
			target: { value: "New title" },
		});
		expect(onDirtyChange).toHaveBeenLastCalledWith(true);
		fireEvent.click(screen.getByRole("button", { name: "Save sheet" }));
		expect(await screen.findByText("Save unavailable")).toBeTruthy();
		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({ title: "New title" }),
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Print or save as PDF" }),
		);
		expect(print).toHaveBeenCalledOnce();
	});
});
