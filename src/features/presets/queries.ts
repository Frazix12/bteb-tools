import type { DocumentType } from "#/features/documents/types";
import { orpc } from "#/orpc/client";

export const presetListQueryOptions = () =>
	orpc.presets.list.queryOptions({ input: {} });

export const presetQueryOptions = (slug: string, type: DocumentType) =>
	orpc.presets.getEnabled.queryOptions({ input: { slug, type } });
