import { describe, expect, it } from "vitest";
import { createAesGcmCipher } from "./crypto";
import { fromBase64Url, toBase64Url } from "./encoding";

const randomKey = (bytes = 32) => crypto.getRandomValues(new Uint8Array(bytes));
const key = randomKey();

describe("createAesGcmCipher", () => {
	it("round-trips plaintext", async () => {
		const cipher = await createAesGcmCipher(key);
		const secret = "gho_abc123-🔐";
		await expect(cipher.decrypt(await cipher.encrypt(secret))).resolves.toBe(
			secret,
		);
	});

	it("uses a fresh IV per encryption", async () => {
		const cipher = await createAesGcmCipher(key);
		expect(await cipher.encrypt("same")).not.toBe(await cipher.encrypt("same"));
	});

	it("rejects tampered ciphertext", async () => {
		const cipher = await createAesGcmCipher(key);
		const parts = (await cipher.encrypt("secret")).split(".");
		const sealed = fromBase64Url(parts[2] ?? "");
		sealed[0] = (sealed[0] ?? 0) ^ 0xff;
		parts[2] = toBase64Url(sealed);
		await expect(cipher.decrypt(parts.join("."))).rejects.toThrow();
	});

	it("rejects a different key", async () => {
		const encrypted = await (await createAesGcmCipher(key)).encrypt("secret");
		const other = await createAesGcmCipher(randomKey());
		await expect(other.decrypt(encrypted)).rejects.toThrow();
	});

	it("requires a 32-byte key", async () => {
		await expect(createAesGcmCipher(randomKey(16))).rejects.toThrow(/32 bytes/);
	});
});
