// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { AiKeysPanel } from "./ai-keys-panel";

const key = {
	id: "key-1",
	provider: "google" as const,
	label: "Primary",
	maskedSuffix: "1234",
	enabled: true,
	validationStatus: "valid" as const,
	cooldownUntil: null,
	lastCheckedAt: new Date("2026-07-10T00:00:00Z"),
	lastUsedAt: new Date("2026-07-11T00:00:00Z"),
	lastSuccessAt: null,
	lastFailureAt: null,
	failureCode: null,
	failureMessage: null,
};
const callbacks = {
	onCreate: vi.fn(),
	onReplace: vi.fn(),
	onToggle: vi.fn(),
	onDelete: vi.fn(),
	onValidate: vi.fn(),
	onValidateAll: vi.fn(),
};
afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

test("renders only public key metadata and validation note", () => {
	render(<AiKeysPanel keys={[key]} pending={false} {...callbacks} />);
	expect(screen.getByText("Primary")).toBeTruthy();
	expect(screen.getByText("••••1234")).toBeTruthy();
	expect(screen.getByText("Valid")).toBeTruthy();
	expect(screen.getByText("Jul 10, 2026")).toBeTruthy();
	expect(screen.getByText("Jul 11, 2026")).toBeTruthy();
	expect(
		screen.getByText("Validation may consume a small amount of Gemini quota."),
	).toBeTruthy();
	expect(document.querySelectorAll("input[type=password]")).toHaveLength(2);
	expect(document.body.textContent).not.toContain("full-secret");
});

test("submits and clears secrets, and invokes row actions", () => {
	render(<AiKeysPanel keys={[key]} pending={false} {...callbacks} />);
	fireEvent.change(screen.getByLabelText("Key label"), {
		target: { value: "Backup" },
	});
	fireEvent.change(screen.getByLabelText("New API key"), {
		target: { value: "full-secret" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Add key" }));
	expect(callbacks.onCreate).toHaveBeenCalledWith("Backup", "full-secret");
	expect((screen.getByLabelText("New API key") as HTMLInputElement).value).toBe(
		"",
	);
	fireEvent.change(screen.getByLabelText("Replacement key for Primary"), {
		target: { value: "replacement" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Replace Primary" }));
	expect(callbacks.onReplace).toHaveBeenCalledWith(key.id, "replacement");
	fireEvent.click(screen.getByRole("button", { name: "Disable Primary" }));
	fireEvent.click(screen.getByRole("button", { name: "Validate Primary" }));
	fireEvent.click(screen.getByRole("button", { name: "Check all keys" }));
	expect(callbacks.onToggle).toHaveBeenCalledWith(key, false);
	expect(callbacks.onValidate).toHaveBeenCalledWith(key.id);
	expect(callbacks.onValidateAll).toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: "Delete Primary" }));
	fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
	expect(callbacks.onDelete).toHaveBeenCalledWith(key.id);
});

test("marks invalid and cooling keys and prevents enabling invalid keys", () => {
	const invalid = {
		...key,
		validationStatus: "invalid" as const,
		enabled: false,
	};
	const cooling = {
		...key,
		id: "key-2",
		label: "Cooling",
		validationStatus: "transient_failure" as const,
		cooldownUntil: new Date("2026-07-13T00:00:00Z"),
	};
	render(
		<AiKeysPanel keys={[invalid, cooling]} pending={false} {...callbacks} />,
	);
	expect(screen.getByText("Invalid")).toBeTruthy();
	expect(screen.getByText("Cooling down")).toBeTruthy();
	expect(
		(
			screen.getByRole("button", {
				name: "Enable Primary",
			}) as HTMLButtonElement
		).disabled,
	).toBe(true);
});
