import { describe, expect, test, vi } from "vitest";

import type { IndexSheetData } from "#/orpc/schemas/document";
import type { DocumentRecord } from "./document-service";
import {
	createDocumentService,
	DocumentNotFoundError,
} from "./document-service";

const indexData: IndexSheetData = {
	schemaVersion: 1,
	exportedAt: "2026-07-10T08:00:00.000Z",
	title: "INDEX",
	rowsPerPage: 10,
	showPageNo: false,
	entries: [],
};

const record = {
	id: "11111111-1111-4111-8111-111111111111",
	ownerId: "owner-1",
	type: "index_sheet" as const,
	title: "INDEX",
	data: indexData,
	logoDataUrl: null,
	createdAt: new Date("2026-07-10T08:00:00.000Z"),
	updatedAt: new Date("2026-07-10T08:00:00.000Z"),
};

function repository() {
	const get = vi.fn<() => Promise<DocumentRecord | null>>(() =>
		Promise.resolve(record),
	);
	return {
		list: vi.fn(() => Promise.resolve([record])),
		get,
		create: vi.fn(() => Promise.resolve(record)),
		update: vi.fn(() => Promise.resolve(record)),
		duplicate: vi.fn(
			(
				_id: string,
				_ownerId: string,
				validate: (value: DocumentRecord) => DocumentRecord,
			) => Promise.resolve(validate(record)),
		),
		remove: vi.fn(() => Promise.resolve(record)),
	};
}

describe("document service ownership", () => {
	test("scopes every lookup and mutation to the authenticated owner", async () => {
		const repo = repository();
		const service = createDocumentService(repo);

		await service.list("owner-1");
		await service.create("owner-1", {
			type: "index_sheet",
			title: "INDEX",
			data: indexData,
			logoDataUrl: null,
		});
		await service.get("owner-1", { id: record.id, type: "index_sheet" });
		await service.update("owner-1", {
			id: record.id,
			type: "index_sheet",
			title: "Updated",
			data: indexData,
			logoDataUrl: null,
		});
		await service.duplicate("owner-1", record.id);
		await service.remove("owner-1", record.id);

		expect(repo.list).toHaveBeenCalledWith("owner-1");
		expect(repo.create).toHaveBeenCalledWith(
			expect.objectContaining({ ownerId: "owner-1", type: "index_sheet" }),
		);
		expect(repo.get).toHaveBeenCalledWith(record.id, "owner-1");
		expect(repo.update).toHaveBeenCalledWith(
			expect.objectContaining({ id: record.id, ownerId: "owner-1" }),
		);
		expect(repo.duplicate).toHaveBeenCalledWith(
			record.id,
			"owner-1",
			expect.any(Function),
		);
		expect(repo.remove).toHaveBeenCalledWith(record.id, "owner-1");
	});

	test("rejects a type and payload mismatch before persistence", async () => {
		const repo = repository();
		const service = createDocumentService(repo);

		await expect(
			service.create("owner-1", {
				type: "cover_page",
				title: "Invalid",
				data: indexData,
				logoDataUrl: null,
			}),
		).rejects.toThrow("does not match");
		expect(repo.create).not.toHaveBeenCalled();
	});

	test("does not allow an update to change an existing document type", async () => {
		const repo = repository();
		const service = createDocumentService(repo);

		await expect(
			service.update("owner-1", {
				id: record.id,
				type: "cover_page",
				title: "Cover Page",
				data: {
					schemaVersion: 1,
					exportedAt: "2026-07-10T08:00:00.000Z",
					type: "cover-page",
					instituteName: "",
					instituteShort: "",
					department: "",
					docType: "Assignment",
					logoDataUrl: "",
					submittedBy: {
						name: "",
						regNo: "",
						roll: "",
						subjectName: "",
						subjectCode: "",
						session: "",
						semester: "",
					},
					submittedTo: { name: "", designation: "", department: "" },
				},
				logoDataUrl: null,
			}),
		).rejects.toBeInstanceOf(DocumentNotFoundError);
		expect(repo.update).not.toHaveBeenCalled();
	});

	test("uses the same not-found error for missing and foreign records", async () => {
		const repo = repository();
		repo.get.mockResolvedValue(null);
		const service = createDocumentService(repo);

		await expect(
			service.get("other-owner", { id: record.id, type: "index_sheet" }),
		).rejects.toBeInstanceOf(DocumentNotFoundError);
	});

	test("rejects corrupt stored payloads explicitly", async () => {
		const repo = repository();
		repo.get.mockResolvedValue({ ...record, data: {} as IndexSheetData });
		const service = createDocumentService(repo);

		await expect(
			service.get("owner-1", { id: record.id, type: "index_sheet" }),
		).rejects.toThrow("Stored document data is invalid");
	});

	test("validates a duplicate source before the repository copies it", async () => {
		const repo = repository();
		repo.duplicate.mockImplementation((_id, _ownerId, validate) =>
			Promise.resolve(validate({ ...record, data: {} as IndexSheetData })),
		);
		const service = createDocumentService(repo);

		await expect(service.duplicate("owner-1", record.id)).rejects.toThrow(
			"Stored document data is invalid",
		);
	});
});
