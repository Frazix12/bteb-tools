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
	}) => <a href={`/login?redirect=${redirect}`}>{children}</a>,
}));

import { CoverPageEditor } from "./cover-page-editor";
import { createBlankCoverPage } from "./defaults";

afterEach(cleanup);

const renderEditor = (overrides = {}) => {
	const props = {
		initialData: createBlankCoverPage(),
		onSave: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
	const client = new QueryClient({
		defaultOptions: { mutations: { retry: false } },
	});
	return {
		...render(
			<QueryClientProvider client={client}>
				<CoverPageEditor {...props} />
			</QueryClientProvider>,
		),
		props,
	};
};

describe("cover page editor", () => {
	test("keeps print available but gates save and AI for guests", () => {
		const onSave = vi.fn();
		renderEditor({
			canSave: false,
			canUseAi: false,
			signInRedirect: "/cover-page/new",
			onSave,
		});
		expect(
			screen.getByRole("button", { name: /print or save as pdf/i }),
		).toBeTruthy();
		expect(screen.getByRole("link", { name: /sign in to save/i })).toBeTruthy();
		expect(
			screen.getByRole("link", { name: /sign in to use ai/i }),
		).toBeTruthy();
		expect(onSave).not.toHaveBeenCalled();
	});
	test("applies reviewed autofill to the dirty draft without saving", async () => {
		extractMutation.mockResolvedValueOnce({
			type: "cover_page",
			patch: { instituteName: "AI Institute", department: "Computer" },
			extractedFieldCount: 2,
			warnings: [],
		});
		const onDirtyChange = vi.fn();
		const { props } = renderEditor({ onDirtyChange });
		fireEvent.click(screen.getByRole("button", { name: "AI autofill" }));
		fireEvent.change(screen.getByLabelText("Source text"), {
			target: { value: "Detailed cover page information for extraction" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Extract details" }));
		fireEvent.click(
			await screen.findByRole("button", { name: "Apply selected" }),
		);
		expect(screen.getByDisplayValue("AI Institute")).toBeTruthy();
		expect(onDirtyChange).toHaveBeenLastCalledWith(true);
		expect(props.onSave).not.toHaveBeenCalled();
	});
	test("edits every legacy field and renders the derived heading live", () => {
		renderEditor();
		const values = {
			"Institution name": "Example Polytechnic",
			"Institution short form (optional)": "(EP)",
			Department: "Computer Science",
			"Document type": "Assignment",
			"Submitted by name": "Student",
			"Registration no.": "1001",
			"Roll no.": "2002",
			"Subject name": "mathematics-3",
			"Subject code": "25931",
			Session: "2024-2025",
			Semester: "3rd",
			"Submitted to name": "Teacher",
			Designation: "Lecturer",
			"Submitted to department": "Mathematics",
		};
		for (const [label, value] of Object.entries(values)) {
			fireEvent.change(screen.getByLabelText(label), { target: { value } });
		}

		expect(screen.getByTestId("cover-preview").textContent).toContain(
			"Mathematics Assignment",
		);
		for (const value of Object.values(values)) {
			expect(screen.getByTestId("cover-preview").textContent).toContain(value);
		}
	});

	test("uploads and removes a validated logo", async () => {
		renderEditor();
		const dataUrl = "data:image/png;base64,YQ==";
		const file = new File(["a"], "logo.png", { type: "image/png" });
		Object.defineProperty(FileReader.prototype, "readAsDataURL", {
			configurable: true,
			value() {
				Object.defineProperty(this, "result", { value: dataUrl });
				this.onload?.(new ProgressEvent("load"));
			},
		});
		fireEvent.change(screen.getByLabelText("Logo image"), {
			target: { files: [file] },
		});
		expect(
			(await screen.findByAltText("Institution logo")).getAttribute("src"),
		).toBe(dataUrl);
		fireEvent.click(screen.getByRole("button", { name: "Remove logo" }));
		expect(screen.queryByAltText("Institution logo")).toBeNull();
		expect(screen.getByText("Logo")).toBeTruthy();
	});

	test("offers save and print without JSON transfer controls", () => {
		renderEditor();
		expect(
			screen.getByRole("button", { name: "Save cover page" }),
		).toBeTruthy();
		expect(
			screen.getByRole("button", { name: "Print or save as PDF" }),
		).toBeTruthy();
		expect(screen.queryByText(["Import", "JSON"].join(" "))).toBeNull();
		expect(screen.queryByText(["Export", "JSON"].join(" "))).toBeNull();
		expect(
			document.querySelector('input[type="file"][accept*="json"]'),
		).toBeNull();
	});

	test("saves logo in the draft, reports errors, prints, and tracks dirty state", async () => {
		const onSave = vi.fn().mockRejectedValue(new Error("Save unavailable"));
		const onDirtyChange = vi.fn();
		const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
		renderEditor({ onSave, onDirtyChange });
		fireEvent.change(screen.getByLabelText("Document type"), {
			target: { value: "Lab Report" },
		});
		expect(onDirtyChange).toHaveBeenLastCalledWith(true);
		fireEvent.click(screen.getByRole("button", { name: "Save cover page" }));
		expect(await screen.findByText("Save unavailable")).toBeTruthy();
		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({ docType: "Lab Report", logoDataUrl: "" }),
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Print or save as PDF" }),
		);
		expect(print).toHaveBeenCalledOnce();
	});

	test("disables saving while persistence is pending", () => {
		renderEditor({ isSaving: true });
		expect(
			(screen.getByRole("button", { name: "Saving…" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
	});
});
