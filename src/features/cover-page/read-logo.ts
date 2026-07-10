const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_LOGO_BYTES = 1_048_576;

type FileReaderFn = (file: File) => Promise<string>;

const browserFileReader: FileReaderFn = (file) =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(new Error("Could not read the logo file."));
		reader.onload = () => {
			if (typeof reader.result !== "string") {
				reject(new Error("Could not read the logo file."));
				return;
			}
			resolve(reader.result);
		};
		reader.readAsDataURL(file);
	});

export async function readLogo(
	file: File,
	read: FileReaderFn = browserFileReader,
) {
	if (!ALLOWED_TYPES.has(file.type)) {
		throw new Error("Logo must be a PNG, JPEG, or WebP image.");
	}
	if (file.size > MAX_LOGO_BYTES) {
		throw new Error("Logo must be 1 MiB or smaller.");
	}
	return read(file);
}
