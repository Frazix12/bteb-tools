import { describe, expect, it } from "vitest";

import { createKeyCipher } from "./crypto";

describe("createKeyCipher", () => {
	it("encrypts and decrypts API keys", () => {
		const cipher = createKeyCipher("x".repeat(32));

		expect(cipher.decrypt(cipher.encrypt("gemini-secret-1234"))).toBe(
			"gemini-secret-1234",
		);
	});

	it("uses a fresh nonce for every encryption", () => {
		const cipher = createKeyCipher("x".repeat(32));

		expect(cipher.encrypt("same")).not.toBe(cipher.encrypt("same"));
	});

	it("produces a versioned base64url payload", () => {
		const payload = createKeyCipher("x".repeat(32)).encrypt("secret");
		const [version, nonce, ciphertext, tag] = payload.split(".");

		expect(version).toBe("v1");
		expect(nonce).toMatch(/^[\w-]+$/);
		expect(ciphertext).toMatch(/^[\w-]+$/);
		expect(tag).toMatch(/^[\w-]+$/);
		expect(Buffer.from(nonce, "base64url")).toHaveLength(12);
		expect(Buffer.from(tag, "base64url")).toHaveLength(16);
	});

	it.each([1, 2, 3])("rejects tampering with payload segment %i", (index) => {
		const cipher = createKeyCipher("x".repeat(32));
		const segments = cipher.encrypt("gemini-secret-1234").split(".");
		const bytes = Buffer.from(segments[index], "base64url");
		bytes[0] ^= 1;
		segments[index] = bytes.toString("base64url");

		expect(() => cipher.decrypt(segments.join("."))).toThrow();
	});

	it("rejects unsupported or malformed payloads", () => {
		const cipher = createKeyCipher("x".repeat(32));
		const payload = cipher.encrypt("secret");

		expect(() => cipher.decrypt(payload.replace(/^v1/, "v2"))).toThrow(
			"Invalid encrypted AI key payload.",
		);
		expect(() => cipher.decrypt("v1.too.few")).toThrow(
			"Invalid encrypted AI key payload.",
		);
	});

	it("creates stable, key-specific fingerprints", () => {
		const cipher = createKeyCipher("x".repeat(32));

		expect(cipher.fingerprint("same")).toBe(cipher.fingerprint("same"));
		expect(cipher.fingerprint("same")).not.toBe(
			cipher.fingerprint("different"),
		);
	});

	it("masks all but the final four characters", () => {
		const cipher = createKeyCipher("x".repeat(32));

		expect(cipher.mask("gemini-secret-1234")).toBe("••••1234");
	});

	it("rejects short root secrets and blank plaintext keys", () => {
		expect(() => createKeyCipher("x".repeat(31))).toThrow(
			"AI key encryption secret is too short.",
		);

		const cipher = createKeyCipher("x".repeat(32));
		expect(() => cipher.encrypt("   ")).toThrow("AI key cannot be blank.");
		expect(() => cipher.fingerprint("")).toThrow("AI key cannot be blank.");
		expect(() => cipher.mask("\t")).toThrow("AI key cannot be blank.");
	});
});
