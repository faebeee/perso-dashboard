import "@tanstack/react-start/server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/** Symmetric encryption for secrets at rest (OAuth tokens). */
export interface SecretCipher {
	encrypt(plaintext: string): string;
	decrypt(payload: string): string;
}

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

/** AES-256-GCM. Output format: `v1.<iv>.<authTag>.<ciphertext>` (base64url). */
export function createAesGcmCipher(base64Key: string): SecretCipher {
	const key = Buffer.from(base64Key, "base64");
	if (key.length !== 32) {
		throw new Error("Encryption key must be 32 bytes");
	}

	return {
		encrypt(plaintext) {
			const iv = randomBytes(12);
			const cipher = createCipheriv(ALGORITHM, key, iv);
			const ciphertext = Buffer.concat([
				cipher.update(plaintext, "utf8"),
				cipher.final(),
			]);
			const tag = cipher.getAuthTag();
			return [VERSION, iv, tag, ciphertext]
				.map((part) =>
					typeof part === "string" ? part : part.toString("base64url"),
				)
				.join(".");
		},

		decrypt(payload) {
			const [version, iv, tag, ciphertext] = payload.split(".");
			if (version !== VERSION || !iv || !tag || ciphertext === undefined) {
				throw new Error("Unsupported encrypted payload");
			}
			const decipher = createDecipheriv(
				ALGORITHM,
				key,
				Buffer.from(iv, "base64url"),
			);
			decipher.setAuthTag(Buffer.from(tag, "base64url"));
			return Buffer.concat([
				decipher.update(Buffer.from(ciphertext, "base64url")),
				decipher.final(),
			]).toString("utf8");
		},
	};
}
