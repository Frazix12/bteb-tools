// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { PresetsPanel } from "./presets-panel";

const preset = {
	id: "preset-1",
	slug: "lab-cover",
	title: "Lab Cover",
	description: "Complete description",
	type: "cover_page" as const,
	enabled: true,
	data: {
		schemaVersion: 1 as const,
		exportedAt: "2026-07-12T00:00:00.000Z",
		type: "cover-page" as const,
		instituteName: "Institute",
		instituteShort: "I",
		department: "CSE",
		docType: "Report",
		logoDataUrl: "" as const,
		submittedBy: {
			name: "A",
			regNo: "1",
			roll: "2",
			subjectName: "S",
			subjectCode: "C",
			session: "25",
			semester: "1",
		},
		submittedTo: { name: "T", designation: "Lecturer", department: "CSE" },
	},
};
const callbacks = {
	onSave: vi.fn(),
	onToggle: vi.fn(),
	onDelete: vi.fn(),
	onPage: vi.fn(),
};
const data = { items: [preset], total: 1, page: 1, pageSize: 20 };
afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

test("hydrates every edit field and submits the complete preset", () => {
	render(
		<PresetsPanel data={data} pending={false} message={null} {...callbacks} />,
	);
	fireEvent.click(screen.getByRole("button", { name: "Edit Lab Cover" }));
	expect((screen.getByLabelText("Slug") as HTMLInputElement).value).toBe(
		"lab-cover",
	);
	expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe(
		"Lab Cover",
	);
	expect((screen.getByLabelText("Description") as HTMLInputElement).value).toBe(
		"Complete description",
	);
	expect((screen.getByLabelText("Type") as HTMLSelectElement).value).toBe(
		"cover_page",
	);
	expect((screen.getByLabelText("Enabled") as HTMLInputElement).checked).toBe(
		true,
	);
	expect(
		(screen.getByLabelText("Preset data (JSON)") as HTMLTextAreaElement).value,
	).toContain('"instituteName": "Institute"');
	fireEvent.click(screen.getByRole("button", { name: "Update preset" }));
	expect(callbacks.onSave).toHaveBeenCalledWith(
		expect.objectContaining({
			slug: "lab-cover",
			description: "Complete description",
			data: preset.data,
		}),
		preset.id,
	);
});

test("rejects malformed JSON and data that does not match its schema", () => {
	render(
		<PresetsPanel data={data} pending={false} message={null} {...callbacks} />,
	);
	fireEvent.click(screen.getByRole("button", { name: "Edit Lab Cover" }));
	const json = screen.getByLabelText("Preset data (JSON)");
	fireEvent.change(json, { target: { value: "{" } });
	fireEvent.click(screen.getByRole("button", { name: "Update preset" }));
	expect(screen.getByRole("alert").textContent).toContain("valid JSON");
	fireEvent.change(json, { target: { value: "{}" } });
	fireEvent.click(screen.getByRole("button", { name: "Update preset" }));
	expect(screen.getByRole("alert").textContent).toContain(
		"selected document schema",
	);
	expect(callbacks.onSave).not.toHaveBeenCalled();
});

test("associates server fields with labelled inputs and confirms row actions", () => {
	render(
		<PresetsPanel
			data={data}
			pending={false}
			message={{
				error: true,
				text: "Invalid",
				fields: { slug: "Already used" },
			}}
			{...callbacks}
		/>,
	);
	fireEvent.click(screen.getByRole("button", { name: "Edit Lab Cover" }));
	const slug = screen.getByLabelText("Slug");
	expect(slug.getAttribute("aria-describedby")).toBe("preset-slug-error");
	expect(screen.getByText("Already used").getAttribute("role")).toBe("alert");
	fireEvent.click(screen.getByRole("button", { name: "Disable Lab Cover" }));
	expect(callbacks.onToggle).toHaveBeenCalledWith(preset, false);
	fireEvent.click(screen.getByRole("button", { name: "Delete Lab Cover" }));
	expect(callbacks.onDelete).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
	expect(callbacks.onDelete).toHaveBeenCalledWith(preset.id);
});

test("enables a disabled preset", () => {
	const disabled = { ...preset, enabled: false };
	render(
		<PresetsPanel
			data={{ ...data, items: [disabled] }}
			pending={false}
			message={null}
			{...callbacks}
		/>,
	);
	fireEvent.click(screen.getByRole("button", { name: "Enable Lab Cover" }));
	expect(callbacks.onToggle).toHaveBeenCalledWith(disabled, true);
});
