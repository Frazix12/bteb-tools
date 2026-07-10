import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { drizzleDocumentRepository } from "#/features/documents/document-repository";
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

const service = createDocumentService(drizzleDocumentRepository);

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

export const list = protectedProcedure
	.input(z.object({}))
	.handler(({ context }) =>
		service.list(context.user.id).then((rows) =>
			rows.map(({ id, type, title, createdAt, updatedAt }) => ({
				id,
				type,
				title,
				createdAt,
				updatedAt,
			})),
		),
	);

export const get = protectedProcedure
	.input(z.object({ id: DocumentIdSchema, type: DocumentTypeSchema }))
	.handler(({ context, input }) =>
		asProcedureResult(() => service.get(context.user.id, input)),
	);

export const create = protectedProcedure
	.input(DocumentWriteSchema)
	.handler(({ context, input }) => service.create(context.user.id, input));

export const update = protectedProcedure
	.input(DocumentWriteSchema.and(z.object({ id: DocumentIdSchema })))
	.handler(({ context, input }) =>
		asProcedureResult(() => service.update(context.user.id, input)),
	);

export const duplicate = protectedProcedure
	.input(z.object({ id: DocumentIdSchema }))
	.handler(({ context, input }) =>
		asProcedureResult(() => service.duplicate(context.user.id, input.id)),
	);

export const remove = protectedProcedure
	.input(z.object({ id: DocumentIdSchema }))
	.handler(({ context, input }) =>
		asProcedureResult(() => service.remove(context.user.id, input.id)),
	);

export const documentRouter = { list, get, create, update, duplicate, remove };
