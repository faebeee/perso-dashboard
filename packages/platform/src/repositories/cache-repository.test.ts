import { createMemorySqlDriver } from "@dashboard/platform/testing/memory-sql-driver";
import { beforeEach, describe, expect, it } from "vitest";
import { createAesGcmCipher } from "../crypto";
import { createDatabase } from "../db/client";
import {
	createDrizzleCacheStore,
	type PersistentCacheStore,
} from "./cache-repository";

let driver: ReturnType<typeof createMemorySqlDriver>;
let store: PersistentCacheStore;

beforeEach(async () => {
	driver = createMemorySqlDriver();
	store = createDrizzleCacheStore(
		await createDatabase(driver),
		await createAesGcmCipher(crypto.getRandomValues(new Uint8Array(32))),
	);
});

describe("persistent cache store", () => {
	it("round-trips entries and encrypts bodies at rest", async () => {
		await store.set("k", "gmail", {
			body: '{"subject":"Salary review"}',
			etag: '"v1"',
			fetchedAt: 100,
		});
		await expect(store.get("k", "gmail")).resolves.toEqual({
			body: '{"subject":"Salary review"}',
			etag: '"v1"',
			lastModified: undefined,
			fetchedAt: 100,
		});
		const raw = driver.db.prepare("SELECT body FROM http_cache").get();
		expect(String(raw?.body)).not.toContain("Salary");
	});

	it("expires, clears per integration and prunes old entries", async () => {
		await store.set("a", "gmail", { body: "a", fetchedAt: 100 });
		await store.set("b", "github", { body: "b", fetchedAt: 100 });
		await store.set("old", "github", { body: "o", fetchedAt: 1 });

		await store.expire("github");
		expect((await store.get("b", "github"))?.fetchedAt).toBe(0);
		expect((await store.get("a", "gmail"))?.fetchedAt).toBe(100);

		await store.prune(50); // expired (0) entries are kept for fallback
		expect(await store.get("b", "github")).not.toBeNull();

		await store.clear("github");
		expect(await store.get("b", "github")).toBeNull();
		expect(await store.get("a", "gmail")).not.toBeNull();
	});
});
