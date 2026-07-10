// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { createBlankCoverPage } from "#/features/cover-page/defaults";
import { createBlankIndexSheet } from "#/features/index-sheet/defaults";
import { AutofillDialog } from "./autofill-dialog";
import type { AutofillResult } from "./extract";

afterEach(cleanup);

describe("autofill dialog", () => {
	test.each([
		"index_sheet",
		"cover_page",
	] as const)("rejects empty %s source text", (type) => {
		const common = { onExtract: vi.fn(), onApply: vi.fn() };
		render(
			type === "index_sheet" ? (
				<AutofillDialog
					{...common}
					type="index_sheet"
					current={createBlankIndexSheet()}
				/>
			) : (
				<AutofillDialog
					{...common}
					type="cover_page"
					current={createBlankCoverPage()}
				/>
			),
		);
		fireEvent.click(screen.getByRole("button", { name: "AI autofill" }));
		fireEvent.click(screen.getByRole("button", { name: "Extract details" }));
		expect(screen.getByRole("alert").textContent).toContain("Paste at least");
	});

	test("locks extraction while pending and reviews an index replacement", async () => {
		let resolve!: (value: AutofillResult) => void;
		const onExtract = vi.fn(
			() => new Promise<AutofillResult>((done) => (resolve = done)),
		);
		const onApply = vi.fn();
		render(
			<AutofillDialog
				type="index_sheet"
				current={{ ...createBlankIndexSheet(), title: "Existing" }}
				onExtract={onExtract}
				onApply={onApply}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "AI autofill" }));
		fireEvent.change(screen.getByLabelText("Source text"), {
			target: { value: "Experiment list with enough useful details" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Extract details" }));
		expect(
			(screen.getByRole("button", { name: "Extracting…" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
		resolve({
			type: "index_sheet",
			patch: {
				title: "Generated",
				entries: [
					{ name: "Ohm's law", pageNo: "", issueDate: "", submitDate: "" },
				],
			},
			extractedFieldCount: 2,
			warnings: ["Check dates"],
		});
		expect(await screen.findByText("Review suggested changes")).toBeTruthy();
		expect(screen.getByText("Replace all index entries")).toBeTruthy();
		expect(screen.getByText("Check dates")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Apply selected" }));
		expect(onApply).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Existing",
				entries: expect.any(Array),
			}),
		);
	});

	test("preserves cover conflicts until overwrite is explicitly selected", async () => {
		const onApply = vi.fn();
		render(
			<AutofillDialog
				type="cover_page"
				current={{
					...createBlankCoverPage(),
					instituteName: "Existing Institute",
					docType: "",
				}}
				onExtract={vi.fn().mockResolvedValue({
					type: "cover_page",
					patch: {
						instituteName: "Suggested Institute",
						docType: "Lab Report",
					},
					extractedFieldCount: 2,
					warnings: [],
				})}
				onApply={onApply}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "AI autofill" }));
		fireEvent.change(screen.getByLabelText("Source text"), {
			target: { value: "Cover page information with enough content" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Extract details" }));
		const overwrite = await screen.findByRole("checkbox", {
			name: /Overwrite Institution name/,
		});
		expect((overwrite as HTMLInputElement).checked).toBe(false);
		fireEvent.click(overwrite);
		fireEvent.click(screen.getByRole("button", { name: "Apply selected" }));
		expect(onApply).toHaveBeenLastCalledWith(
			expect.objectContaining({
				instituteName: "Suggested Institute",
				docType: "Lab Report",
			}),
		);
	});

	test.each([
		["No meaningful fields could be extracted.", "No meaningful fields"],
		["AI autofill quota exceeded.", "Try again"],
		["AI extraction is temporarily unavailable.", "temporarily unavailable"],
	])("shows a useful extraction failure for %s", async (message, expected) => {
		render(
			<AutofillDialog
				type="cover_page"
				current={createBlankCoverPage()}
				onExtract={vi.fn().mockRejectedValue(new Error(message))}
				onApply={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "AI autofill" }));
		fireEvent.change(screen.getByLabelText("Source text"), {
			target: { value: "Cover page information with enough content" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Extract details" }));
		expect((await screen.findByRole("alert")).textContent).toContain(expected);
	});
});
