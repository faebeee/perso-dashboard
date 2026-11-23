import { and, eq, gt, lt } from "drizzle-orm";
import type { SecretCipher } from "../crypto";
import type { AppDatabase } from "../db/client";
import { httpCache } from "../db/schema";
import type { CacheStore } from "../http-cache";

/** Larger responses stay in memory only. */
const MAX_PERSISTED_BYTES = 2 * 1024 * 1024;

export interface PersistentCacheStore extends CacheStore {
	/** Drops entries not confirmed since `before` (cleanup at startup). */
	prune(before: number): Promise<void>;
}

export function createDrizzleCacheStore(
	db: AppDatabase,
	cipher: SecretCipher,
): PersistentCacheStore {
	return {
		async get(key) {
			const row = await db
				.select()
				.from(httpCache)
				.where(eq(httpCache.key, key))
				.get();
			if (!row) return null;
			try {
				return {
					body: await cipher.decrypt(row.body),
					etag: row.etag ?? undefined,
					lastModified: row.lastModified ?? undefined,
					fetchedAt: row.fetchedAt,
				};
			} catch {
				// Unreadable (e.g. a different key): treat as a miss.
				return null;
			}
		},

		async set(key, integrationId, entry) {
			if (entry.body.length > MAX_PERSISTED_BYTES) return;
			const values = {
				integrationId,
				body: await cipher.encrypt(entry.body),
				etag: entry.etag ?? null,
				lastModified: entry.lastModified ?? null,
				fetchedAt: entry.fetchedAt,
			};
			await db
				.insert(httpCache)
				.values({ key, ...values })
				.onConflictDoUpdate({ target: httpCache.key, set: values })
				.run();
		},

		async expire(integrationId) {
			const update = db.update(httpCache).set({ fetchedAt: 0 });
			await (integrationId
				? update.where(eq(httpCache.integrationId, integrationId))
				: update
			).run();
		},

		async clear(integrationId) {
			await db
				.delete(httpCache)
				.where(eq(httpCache.integrationId, integrationId))
				.run();
		},

		async prune(before) {
			// fetchedAt 0 means "expired by Refresh", not "old": keep those.
			await db
				.delete(httpCache)
				.where(and(lt(httpCache.fetchedAt, before), gt(httpCache.fetchedAt, 0)))
				.run();
		},
	};
}
