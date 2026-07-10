import { and, desc, eq } from "drizzle-orm";

import { db } from "#/db";
import { documents } from "#/db/schema";
import type { DocumentData } from "#/orpc/schemas/document";

import type {
	DocumentRecord,
	DocumentRepository,
	DocumentWrite,
} from "./document-service";

function toRecord(row: typeof documents.$inferSelect): DocumentRecord {
	return { ...row, data: row.data as DocumentData };
}

export const drizzleDocumentRepository: DocumentRepository = {
	async list(ownerId) {
		const rows = await db
			.select()
			.from(documents)
			.where(eq(documents.ownerId, ownerId))
			.orderBy(desc(documents.updatedAt));
		return rows.map(toRecord);
	},
	async get(id, ownerId) {
		const [row] = await db
			.select()
			.from(documents)
			.where(and(eq(documents.id, id), eq(documents.ownerId, ownerId)))
			.limit(1);
		return row ? toRecord(row) : null;
	},
	async create(input) {
		const [row] = await db.insert(documents).values(input).returning();
		if (!row) throw new Error("Document insert did not return a row.");
		return toRecord(row);
	},
	async update(input) {
		const { id, ownerId, ...values } = input;
		const [row] = await db
			.update(documents)
			.set({ ...values, updatedAt: new Date() })
			.where(and(eq(documents.id, id), eq(documents.ownerId, ownerId)))
			.returning();
		return row ? toRecord(row) : null;
	},
	async duplicate(id, ownerId, validate) {
		return db.transaction(async (tx) => {
			const [source] = await tx
				.select()
				.from(documents)
				.where(and(eq(documents.id, id), eq(documents.ownerId, ownerId)))
				.limit(1);
			if (!source) return null;
			const validSource = validate(toRecord(source));

			const copy: DocumentWrite & { ownerId: string } = {
				ownerId,
				type: validSource.type,
				title: `${validSource.title} (Copy)`,
				data: validSource.data,
				logoDataUrl: validSource.logoDataUrl,
			};
			const [row] = await tx.insert(documents).values(copy).returning();
			return row ? toRecord(row) : null;
		});
	},
	async remove(id, ownerId) {
		const [row] = await db
			.delete(documents)
			.where(and(eq(documents.id, id), eq(documents.ownerId, ownerId)))
			.returning();
		return row ? toRecord(row) : null;
	},
};
