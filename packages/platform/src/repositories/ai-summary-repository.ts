import { desc, eq, lt } from "drizzle-orm";
import type { SecretCipher } from "../crypto";
import type { AppDatabase } from "../db/client";
import { aiSummaries } from "../db/schema";

export interface StoredAiSummary {
	key: string;
	scope: string;
	text: string;
	providerId: string;
	model: string;
	createdAt: Date;
}

/** Generated summaries, encrypted at rest. */
export interface AiSummaryRepository {
	get(key: string): Promise<StoredAiSummary | null>;
	/** The newest summary of a scope, whatever its content. */
	latest(scope: string): Promise<StoredAiSummary | null>;
	save(summary: Omit<StoredAiSummary, "createdAt">): Promise<StoredAiSummary>;
	/** Deletes summaries created before `before`. */
	prune(before: Date): Promise<void>;
}

export function createDrizzleAiSummaryRepository(
	db: AppDatabase,
	cipher: SecretCipher,
): AiSummaryRepository {
	const decrypt = async (
		row: typeof aiSummaries.$inferSelect | undefined,
	): Promise<StoredAiSummary | null> =>
		row ? { ...row, text: await cipher.decrypt(row.text) } : null;

	return {
		async get(key) {
			return decrypt(
				await db
					.select()
					.from(aiSummaries)
					.where(eq(aiSummaries.key, key))
					.get(),
			);
		},

		async latest(scope) {
			return decrypt(
				await db
					.select()
					.from(aiSummaries)
					.where(eq(aiSummaries.scope, scope))
					.orderBy(desc(aiSummaries.createdAt))
					.limit(1)
					.get(),
			);
		},

		async save(summary) {
			const stored = { ...summary, createdAt: new Date() };
			const values = { ...stored, text: await cipher.encrypt(summary.text) };
			await db
				.insert(aiSummaries)
				.values(values)
				.onConflictDoUpdate({ target: aiSummaries.key, set: values })
				.run();
			return stored;
		},

		async prune(before) {
			await db
				.delete(aiSummaries)
				.where(lt(aiSummaries.createdAt, before))
				.run();
		},
	};
}
