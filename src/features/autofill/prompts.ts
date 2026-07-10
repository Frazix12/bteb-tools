import type { DocumentType } from "#/features/documents/types";

const rules = `Extract only facts explicitly present in the pasted text.
Omit unknown fields instead of guessing or filling defaults.
Keep names and other text in their source language.
Return dates as YYYY-MM-DD only when the complete date is unambiguous; otherwise omit the date.
Never invent student, teacher, registration, roll, institute, or department identity fields.`;

export function buildAutofillPrompt(type: DocumentType, text: string) {
	const target =
		type === "index_sheet"
			? "Extract experiment index rows. Each row must have an explicit experiment name."
			: "Extract cover-page fields, including nested submittedBy and submittedTo fields when explicit.";

	return `${rules}\n${target}\n\nPasted text:\n${text}`;
}
