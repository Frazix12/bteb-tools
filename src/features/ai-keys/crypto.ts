import {
	createCipheriv,
	createDecipheriv,
	createHmac,
	hkdfSync,
	randomBytes,
} from "node:crypto";

const VERSION = "v1";
const NONCE_LENGTH = 12;
const TAG_LENGTH = 16;
const ENCRYPTION_DOMAIN = "bteb-tools/ai-key/encryption/v1";
const FINGERPRINT_DOMAIN = "bteb-tools/ai-key/fingerprint/v1";

export interface KeyCipher {
	encrypt(plaintext: string): string;
	decrypt(payload: string): string;
	fingerprint(plaintext: string): string;
	mask(plaintext: string): string;
}

function requirePlaintext(plaintext: string): void {
	if (plaintext.trim().length === 0) {
		throw new Error("AI key cannot be blank.");
	}
}

function deriveKey(rootSecret: string, domain: string): Buffer {
	return Buffer.from(
		hkdfSync("sha256", rootSecret, Buffer.alloc(0), domain, 32),
	);
}

export function createKeyCipher(rootSecret: string): KeyCipher {
	if (rootSecret.length < 32) {
		throw new Error("AI key encryption secret is too short.");
	}

	const encryptionKey = deriveKey(rootSecret, ENCRYPTION_DOMAIN);
	const fingerprintKey = deriveKey(rootSecret, FINGERPRINT_DOMAIN);

	return {
		encrypt(plaintext) {
			requirePlaintext(plaintext);
			const nonce = randomBytes(NONCE_LENGTH);
			const cipher = createCipheriv("aes-256-gcm", encryptionKey, nonce);
			const ciphertext = Buffer.concat([
				cipher.update(plaintext, "utf8"),
				cipher.final(),
			]);
			const tag = cipher.getAuthTag();

			return [
				VERSION,
				nonce.toString("base64url"),
				ciphertext.toString("base64url"),
				tag.toString("base64url"),
			].join(".");
		},

		decrypt(payload) {
			const segments = payload.split(".");
			if (segments.length !== 4 || segments[0] !== VERSION) {
				throw new Error("Invalid encrypted AI key payload.");
			}

			const nonce = Buffer.from(segments[1], "base64url");
			const ciphertext = Buffer.from(segments[2], "base64url");
			const tag = Buffer.from(segments[3], "base64url");
			if (nonce.length !== NONCE_LENGTH || tag.length !== TAG_LENGTH) {
				throw new Error("Invalid encrypted AI key payload.");
			}

			const decipher = createDecipheriv("aes-256-gcm", encryptionKey, nonce);
			decipher.setAuthTag(tag);
			return Buffer.concat([
				decipher.update(ciphertext),
				decipher.final(),
			]).toString("utf8");
		},

		fingerprint(plaintext) {
			requirePlaintext(plaintext);
			return createHmac("sha256", fingerprintKey)
				.update(plaintext, "utf8")
				.digest("base64url");
		},

		mask(plaintext) {
			requirePlaintext(plaintext);
			return `••••${plaintext.slice(-4)}`;
		},
	};
}
