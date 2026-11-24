import { inArray, lt } from "drizzle-orm";
import type { AppDatabase } from "../db/client";
import { streamDismissals } from "../db/schema";

/** Live stream entries you cleared, by entry id (no content is stored). */
export interface StreamDismissalRepository {
	list(): Promise<string[]>;
	dismiss(eventIds: readonly string[]): Promise<void>;
	/** Undo: shows these entries again. */
	restore(eventIds: readonly string[]): Promise<void>;
	/** Forgets entries cleared before `before` (they've left the stream by then). */
	prune(before: Date): Promise<void>;
}

/** SQLite's limit on bound parameters is generous, but stay well below it. */
const CHUNK = 200;

const chunks = <T>(list: readonly T[]) =>
	Array.from({ length: Math.ceil(list.length / CHUNK) }, (_, i) =>
		list.slice(i * CHUNK, (i + 1) * CHUNK),
	);

export function createDrizzleStreamDismissalRepository(
	db: AppDatabase,
): StreamDismissalRepository {
	return {
		async list() {
			const rows = await db
				.select({ eventId: streamDismissals.eventId })
				.from(streamDismissals)
				.all();
			return rows.map((row) => row.eventId);
		},

		async dismiss(eventIds) {
			const dismissedAt = new Date();
			for (const part of chunks([...new Set(eventIds)]))
				await db
					.insert(streamDismissals)
					.values(part.map((eventId) => ({ eventId, dismissedAt })))
					.onConflictDoNothing()
					.run();
		},

		async restore(eventIds) {
			for (const part of chunks(eventIds))
				await db
					.delete(streamDismissals)
					.where(inArray(streamDismissals.eventId, [...part]))
					.run();
		},

		async prune(before) {
			await db
				.delete(streamDismissals)
				.where(lt(streamDismissals.dismissedAt, before))
				.run();
		},
	};
}
