import type { DocumentData } from "#/orpc/schemas/document";
import {
	CoverPageDataSchema,
	IndexSheetDataSchema,
} from "#/orpc/schemas/document";

import { inlineLogoStorage } from "../cover-page/logo-storage";
import type { DocumentType } from "./types";

export type DocumentRecord = {
	id: string;
	ownerId: string;
	type: DocumentType;
	title: string;
	data: DocumentData;
	logoDataUrl: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export type DocumentWrite = {
	type: DocumentType;
	title: string;
	data: DocumentData;
	logoDataUrl: string | null;
};

export interface DocumentRepository {
	list(ownerId: string): Promise<DocumentRecord[]>;
	get(id: string, ownerId: string): Promise<DocumentRecord | null>;
	create(input: DocumentWrite & { ownerId: string }): Promise<DocumentRecord>;
	update(
		input: DocumentWrite & { id: string; ownerId: string },
	): Promise<DocumentRecord | null>;
	duplicate(
		id: string,
		ownerId: string,
		validate: (record: DocumentRecord) => DocumentRecord,
	): Promise<DocumentRecord | null>;
	remove(id: string, ownerId: string): Promise<DocumentRecord | null>;
}

export class DocumentNotFoundError extends Error {
	constructor() {
		super("Document not found.");
		this.name = "DocumentNotFoundError";
	}
}

function validateWrite(input: DocumentWrite): DocumentWrite {
	if (input.type === "index_sheet") {
		const data = IndexSheetDataSchema.safeParse(input.data);
		if (!data.success || input.logoDataUrl) {
			throw new Error("Document type does not match its payload.");
		}
		return { ...input, data: data.data, logoDataUrl: null };
	}

	const data = CoverPageDataSchema.safeParse(input.data);
	if (!data.success) {
		throw new Error("Document type does not match its payload.");
	}
	const logoDataUrl = inlineLogoStorage.normalize(
		input.logoDataUrl ?? data.data.logoDataUrl,
	);
	if ((data.data.logoDataUrl || null) !== logoDataUrl) {
		throw new Error("Cover logo does not match its legacy payload.");
	}

	return { ...input, data: data.data, logoDataUrl };
}

function validateRecord(record: DocumentRecord) {
	try {
		return { ...record, ...validateWrite(record) };
	} catch (error) {
		throw new Error("Stored document data is invalid.", { cause: error });
	}
}

export function createDocumentService(repository: DocumentRepository) {
	return {
		async list(ownerId: string) {
			return (await repository.list(ownerId)).map(validateRecord);
		},
		async get(ownerId: string, input: { id: string; type: DocumentType }) {
			const document = await repository.get(input.id, ownerId);
			if (!document || document.type !== input.type) {
				throw new DocumentNotFoundError();
			}
			return validateRecord(document);
		},
		async create(ownerId: string, input: DocumentWrite) {
			return validateRecord(
				await repository.create({ ownerId, ...validateWrite(input) }),
			);
		},
		async update(ownerId: string, input: DocumentWrite & { id: string }) {
			const document = await repository.update({
				ownerId,
				...validateWrite(input),
				id: input.id,
			});
			if (!document) throw new DocumentNotFoundError();
			return validateRecord(document);
		},
		async duplicate(ownerId: string, id: string) {
			const document = await repository.duplicate(id, ownerId, validateRecord);
			if (!document) throw new DocumentNotFoundError();
			return validateRecord(document);
		},
		async remove(ownerId: string, id: string) {
			const document = await repository.remove(id, ownerId);
			if (!document) throw new DocumentNotFoundError();
			return validateRecord(document);
		},
	};
}

export type DocumentService = ReturnType<typeof createDocumentService>;
