import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const KEY_FILE = "encryption.key";
const KEY_BYTES = 32;

/**
 * The 32-byte key that encrypts tokens and client secrets in the database,
 * created on first use. Stored next to the database, readable only by you
 * (the desktop app keeps its key in the OS keychain instead).
 */
export async function loadOrCreateKey(dataDir: string): Promise<Uint8Array> {
	const path = join(dataDir, KEY_FILE);
	try {
		const key = Buffer.from((await readFile(path, "utf8")).trim(), "base64url");
		if (key.length !== KEY_BYTES) {
			throw new Error(`${path} does not hold a ${KEY_BYTES}-byte key`);
		}
		return key;
	} catch (cause) {
		if ((cause as NodeJS.ErrnoException).code !== "ENOENT") throw cause;
	}
	await mkdir(dataDir, { recursive: true, mode: 0o700 });
	const key = randomBytes(KEY_BYTES);
	// "wx": never overwrite a key another request created meanwhile.
	try {
		await writeFile(path, key.toString("base64url"), {
			mode: 0o600,
			flag: "wx",
		});
	} catch (cause) {
		if ((cause as NodeJS.ErrnoException).code === "EEXIST") {
			return loadOrCreateKey(dataDir);
		}
		throw cause;
	}
	return key;
}
