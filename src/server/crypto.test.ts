import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createAesGcmCipher } from "./crypto";

const key = randomBytes(32).toString("base64");

describe("createAesGcmCipher", () => {
	it("round-trips plaintext", () => {
		const cipher = createAesGcmCipher(key);
		const secret = "gho_abc123-🔐";
		expect(cipher.decrypt(cipher.encrypt(secret))).toBe(secret);
	});

	it("uses a fresh IV per encryption", () => {
		const cipher = createAesGcmCipher(key);
		expect(cipher.encrypt("same")).not.toBe(cipher.encrypt("same"));
	});

	it("rejects tampered ciphertext", () => {
		const cipher = createAesGcmCipher(key);
		const parts = cipher.encrypt("secret").split(".");
		parts[3] = Buffer.from("tampered").toString("base64url");
		expect(() => cipher.decrypt(parts.join("."))).toThrow();
	});

	it("rejects a different key", () => {
		const encrypted = createAesGcmCipher(key).encrypt("secret");
		const other = createAesGcmCipher(randomBytes(32).toString("base64"));
		expect(() => other.decrypt(encrypted)).toThrow();
	});

	it("requires a 32-byte key", () => {
		expect(() =>
			createAesGcmCipher(randomBytes(16).toString("base64")),
		).toThrow(/32 bytes/);
	});
});
