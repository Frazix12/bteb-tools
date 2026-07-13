import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { drizzleDocumentRepository } from "#/features/documents/document-repository";
import type { DocumentService } from "#/features/documents/document-service";
import {
	createDocumentService,
	DocumentNotFoundError,
} from "#/features/documents/document-service";
import { protectedProcedure } from "#/orpc/middleware/auth";
import {
	DocumentIdSchema,
	DocumentTypeSchema,
	DocumentWriteSchema,
} from "#/orpc/schemas/document";

async function asProcedureResult<T>(operation: () => Promise<T>) {
	try {
		return await operation();
	} catch (error) {
		if (error instanceof DocumentNotFoundError) {
			throw new ORPCError("NOT_FOUND", { message: "Document not found." });
		}
		throw error;
	}
}

export function createDocumentRouter(service: DocumentService) {
	const list = protectedProcedure.input(z.object({})).handler(({ context }) =>
		service.list(context.user.id).then((rows) =>
			rows.map(({ id, type, title, data, createdAt, updatedAt }) => ({
				id,
				type,
				title,
				data,
				createdAt,
				updatedAt,
			})),
		),
	);
	const get = protectedProcedure
		.input(z.object({ id: DocumentIdSchema, type: DocumentTypeSchema }))
		.handler(({ context, input }) =>
			asProcedureResult(() => service.get(context.user.id, input)),
		);
	const create = protectedProcedure
		.input(DocumentWriteSchema)
		.handler(({ context, input }) => service.create(context.user.id, input));
	const update = protectedProcedure
		.input(DocumentWriteSchema.and(z.object({ id: DocumentIdSchema })))
		.handler(({ context, input }) =>
			asProcedureResult(() => service.update(context.user.id, input)),
		);
	const duplicate = protectedProcedure
		.input(z.object({ id: DocumentIdSchema }))
		.handler(({ context, input }) =>
			asProcedureResult(() => service.duplicate(context.user.id, input.id)),
		);
	const remove = protectedProcedure
		.input(z.object({ id: DocumentIdSchema }))
		.handler(({ context, input }) =>
			asProcedureResult(() => service.remove(context.user.id, input.id)),
		);
	return { list, get, create, update, duplicate, remove };
}

const service = createDocumentService(drizzleDocumentRepository);
export const documentRouter = createDocumentRouter(service);
