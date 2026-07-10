import type { CoverPageData } from "#/orpc/schemas/document";

export interface LogoStorage {
	normalize(dataUrl: string | null): string | null;
	toDocumentData(data: CoverPageData, storedLogo: string | null): CoverPageData;
}

type InlineLogoStorageOptions = {
	maxEncodedBytes?: number;
};

const SUPPORTED_LOGO =
	/^data:image\/(?:png|jpeg|webp);base64,([a-zA-Z0-9+/=]+)$/;

export function createInlineLogoStorage({
	maxEncodedBytes = 1_048_576,
}: InlineLogoStorageOptions = {}): LogoStorage {
	return {
		normalize(dataUrl) {
			if (!dataUrl) return null;

			const match = SUPPORTED_LOGO.exec(dataUrl);
			if (!match) {
				throw new Error("Logo must be a PNG, JPEG, or WebP image.");
			}
			if ((match[1]?.length ?? 0) > maxEncodedBytes) {
				throw new Error("Logo is too large.");
			}

			return dataUrl;
		},
		toDocumentData(data, storedLogo) {
			return { ...data, logoDataUrl: storedLogo ?? "" };
		},
	};
}

export const inlineLogoStorage = createInlineLogoStorage();
