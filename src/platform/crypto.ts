import { fromBase64Url, toBase64Url } from "./encoding";

/** Symmetric encryption for secrets at rest (OAuth tokens, client secrets). */
export interface SecretCipher {
	encrypt(plaintext: string): Promise<string>;
	decrypt(payload: string): Promise<string>;
}

const VERSION = "v1";
const IV_BYTES = 12;

/**
 * AES-256-GCM via WebCrypto. Output format: `v1.<iv>.<ciphertext+tag>`
 * (base64url). The key comes from the OS keychain, see `Host.loadEncryptionKey`.
 */
export async function createAesGcmCipher(
	rawKey: Uint8Array,
): Promise<SecretCipher> {
	if (rawKey.length !== 32) {
		throw new Error("Encryption key must be 32 bytes");
	}
	const key = await crypto.subtle.importKey(
		"raw",
		new Uint8Array(rawKey),
		"AES-GCM",
		false,
		["encrypt", "decrypt"],
	);

	return {
		async encrypt(plaintext) {
			const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
			const sealed = await crypto.subtle.encrypt(
				{ name: "AES-GCM", iv },
				key,
				new TextEncoder().encode(plaintext),
			);
			return [
				VERSION,
				toBase64Url(iv),
				toBase64Url(new Uint8Array(sealed)),
			].join(".");
		},

		async decrypt(payload) {
			const [version, iv, sealed] = payload.split(".");
			if (version !== VERSION || !iv || sealed === undefined) {
				throw new Error("Unsupported encrypted payload");
			}
			const plaintext = await crypto.subtle.decrypt(
				{ name: "AES-GCM", iv: fromBase64Url(iv) },
				key,
				fromBase64Url(sealed),
			);
			return new TextDecoder().decode(plaintext);
		},
	};
}
