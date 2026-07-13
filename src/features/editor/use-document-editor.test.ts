import { describe, expect, test } from "vitest";
import { DocumentWriteSchema } from "#/orpc/schemas/document";
import {
	prepareCoverPageWrite,
	prepareIndexSheetWrite,
} from "./use-document-editor";

const invalidDate = "not-a-date";

describe("document editor write payloads", () => {
	test("repairs partial index sheet drafts before saving", () => {
		const input = prepareIndexSheetWrite({
			title: "  ",
			entries: [
				{
					name: "Experiment",
					issueDate: invalidDate,
					submitDate: "2026-07-13",
					pageNo: "1",
				},
			],
		} as never);

		expect(input.title).toBe("INDEX");
		expect(input.data.entries[0].issueDate).toBe("");
		expect(DocumentWriteSchema.safeParse(input).success).toBe(true);
	});

	test("repairs partial cover page drafts before saving", () => {
		const input = prepareCoverPageWrite({ docType: "  " } as never);

		expect(input.title).toBe("Cover Page");
		expect(input.data.type).toBe("cover-page");
		expect(DocumentWriteSchema.safeParse(input).success).toBe(true);
	});
});
