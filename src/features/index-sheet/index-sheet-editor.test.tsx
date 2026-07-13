// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

const { extractMutation } = vi.hoisted(() => ({ extractMutation: vi.fn() }));
vi.mock("#/features/autofill/queries", () => ({
	autofillExtractMutationOptions: () => ({
		mutationFn: extractMutation,
	}),
}));
vi.mock("#/features/auth/sign-in-action", () => ({
	SignInAction: ({
		children,
		redirect,
	}: {
		children: React.ReactNode;
		redirect: string;
	}) => (
		<a href={`/login?redirect=${encodeURIComponent(redirect)}`}>{children}</a>
	),
}));

import { createBlankIndexSheet } from "./defaults";
import { IndexSheetEditor } from "./index-sheet-editor";

afterEach(cleanup);

const renderEditor = (overrides = {}) => {
	const props = {
		initialData: createBlankIndexSheet(),
		onSave: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
	const client = new QueryClient({
		defaultOptions: { mutations: { retry: false } },
	});
	return {
		...render(
			<QueryClientProvider client={client}>
				<IndexSheetEditor {...props} />
			</QueryClientProvider>,
		),
		props,
	};
};

describe("index sheet editor", () => {
	test("keeps print available but gates save and AI for guests", () => {
		const onSave = vi.fn();
		renderEditor({
			canSave: false,
			canUseAi: false,
			signInRedirect: "/index-sheet/new?preset=lab-index",
			onSave,
		});
		expect(
			screen.getByRole("button", { name: /print or save as pdf/i }),
		).toBeTruthy();
		const expectedHref =
			"/login?redirect=%2Findex-sheet%2Fnew%3Fpreset%3Dlab-index";
		expect(
			screen
				.getByRole("link", { name: /sign in to save/i })
				.getAttribute("href"),
		).toBe(expectedHref);
		expect(
			screen
				.getByRole("link", { name: /sign in to use ai/i })
				.getAttribute("href"),
		).toBe(expectedHref);
		expect(onSave).not.toHaveBeenCalled();
	});
	test("applies reviewed autofill to the dirty draft without saving", async () => {
		extractMutation.mockResolvedValueOnce({
			type: "index_sheet",
			patch: {
				entries: [
					{
						name: "AI experiment",
						pageNo: "",
						issueDate: "",
						submitDate: "",
					},
				],
			},
			extractedFieldCount: 1,
			warnings: [],
		});
		const onDirtyChange = vi.fn();
		const { props } = renderEditor({ onDirtyChange });
		fireEvent.click(screen.getByRole("button", { name: "AI autofill" }));
		fireEvent.change(screen.getByLabelText("Source text"), {
			target: { value: "A detailed experiment list for extraction" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Extract details" }));
		fireEvent.click(
			await screen.findByRole("button", { name: "Apply selected" }),
		);
		expect(screen.getAllByText("AI experiment").length).toBeGreaterThan(1);
		expect(onDirtyChange).toHaveBeenLastCalledWith(true);
		expect(props.onSave).not.toHaveBeenCalled();
	});
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

	test("keeps the edited row selected when an earlier row is deleted", () => {
		renderEditor({
			initialData: {
				...createBlankIndexSheet(),
				entries: ["First", "Second", "Third"].map((name) => ({
					name,
					pageNo: "",
					issueDate: "",
					submitDate: "",
				})),
			},
		});
		fireEvent.click(screen.getByRole("button", { name: "Edit Third" }));
		fireEvent.click(screen.getByRole("button", { name: "Delete First" }));
		fireEvent.change(screen.getByLabelText("Experiment name"), {
			target: { value: "Updated Third" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Update row" }));

		expect(screen.getAllByText("Updated Third").length).toBeGreaterThan(1);
		expect(screen.getAllByText("Second").length).toBeGreaterThan(1);
	});

	test("offers save and print without JSON transfer controls", () => {
		renderEditor();
		expect(screen.getByRole("button", { name: "Save sheet" })).toBeTruthy();
		expect(
			screen.getByRole("button", { name: "Print or save as PDF" }),
		).toBeTruthy();
		expect(screen.queryByText(["Import", "JSON"].join(" "))).toBeNull();
		expect(screen.queryByText(["Export", "JSON"].join(" "))).toBeNull();
		expect(
			document.querySelector('input[type="file"][accept*="json"]'),
		).toBeNull();
	});

	test("saves the current draft, exposes failures, prints, and reports dirty state", async () => {
		const onSave = vi.fn().mockRejectedValue(new Error("Save unavailable"));
		const onDirtyChange = vi.fn();
		const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
		const { props } = renderEditor({ onSave, onDirtyChange });
		fireEvent.change(screen.getByLabelText("Sheet title"), {
			target: { value: "New title" },
		});
		expect(onDirtyChange).toHaveBeenLastCalledWith(true);
		fireEvent.click(screen.getByRole("button", { name: "Save sheet" }));
		expect(await screen.findByText("Save unavailable")).toBeTruthy();
		expect(onSave).toHaveBeenCalledWith({
			...props.initialData,
			title: "New title",
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Print or save as PDF" }),
		);
		expect(print).toHaveBeenCalledOnce();
	});

	test("normalizes a blank title in the saved local draft", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const onDirtyChange = vi.fn();
		renderEditor({ onSave, onDirtyChange });
		fireEvent.change(screen.getByLabelText("Sheet title"), {
			target: { value: "   " },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save sheet" }));

		expect(await screen.findByDisplayValue("INDEX")).toBeTruthy();
		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({ title: "INDEX" }),
		);
		expect(onDirtyChange).toHaveBeenLastCalledWith(false);
	});
});
