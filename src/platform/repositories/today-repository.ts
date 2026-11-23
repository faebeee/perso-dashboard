import { and, asc, desc, eq, gte, or } from "drizzle-orm";
import type { NewTodayItem, TodayItem } from "#/core/today";
import type { AppDatabase } from "../db/client";
import { todayItems } from "../db/schema";

export interface TodayRepository {
	/**
	 * Everything still open (unfinished items carry over to the next day)
	 * plus what you finished since `since` (start of today).
	 */
	list(since: Date): Promise<TodayItem[]>;
	/** Items you ticked off since `since`, newest first (daily review). */
	completedSince(since: Date): Promise<TodayItem[]>;
	add(item: NewTodayItem): Promise<TodayItem>;
	setDone(id: string, done: boolean): Promise<void>;
	delete(id: string): Promise<void>;
}

export function createDrizzleTodayRepository(db: AppDatabase): TodayRepository {
	const toItem = (row: typeof todayItems.$inferSelect): TodayItem => ({
		id: row.id,
		kind: row.kind,
		title: row.title,
		ref:
			row.kind === "item" && row.source && row.itemKind && row.itemId && row.url
				? {
						source: row.source,
						itemKind: row.itemKind,
						itemId: row.itemId,
						url: row.url,
						detailRef: row.detailRef ?? undefined,
						project: row.project ?? undefined,
					}
				: undefined,
		done: row.done,
		doneAt: row.doneAt,
		createdAt: row.createdAt,
	});

	return {
		async completedSince(since) {
			const rows = await db
				.select()
				.from(todayItems)
				.where(and(eq(todayItems.done, true), gte(todayItems.doneAt, since)))
				.orderBy(desc(todayItems.doneAt))
				.all();
			return rows.map(toItem);
		},

		async list(since) {
			const rows = await db
				.select()
				.from(todayItems)
				.where(
					or(
						eq(todayItems.done, false),
						and(eq(todayItems.done, true), gte(todayItems.doneAt, since)),
					),
				)
				.orderBy(asc(todayItems.createdAt))
				.all();
			return rows.map(toItem);
		},

		async add({ kind, title, ref }) {
			// Pinning the same item twice keeps one entry (and reopens it).
			if (ref) {
				const existing = await db
					.select()
					.from(todayItems)
					.where(eq(todayItems.itemId, ref.itemId))
					.get();
				if (existing) {
					await db
						.update(todayItems)
						.set({ done: false, doneAt: null })
						.where(eq(todayItems.id, existing.id))
						.run();
					return {
						id: existing.id,
						kind,
						title: existing.title,
						ref,
						done: false,
						doneAt: null,
						createdAt: existing.createdAt,
					};
				}
			}
			const item: TodayItem = {
				id: globalThis.crypto.randomUUID(),
				kind,
				title: title.trim(),
				ref,
				done: false,
				doneAt: null,
				createdAt: new Date(),
			};
			await db
				.insert(todayItems)
				.values({
					id: item.id,
					kind,
					title: item.title,
					source: ref?.source ?? null,
					itemKind: ref?.itemKind ?? null,
					itemId: ref?.itemId ?? null,
					url: ref?.url ?? null,
					detailRef: ref?.detailRef ?? null,
					project: ref?.project ?? null,
					done: false,
					doneAt: null,
					createdAt: item.createdAt,
				})
				.run();
			return item;
		},

		async setDone(id, done) {
			await db
				.update(todayItems)
				.set({ done, doneAt: done ? new Date() : null })
				.where(eq(todayItems.id, id))
				.run();
		},

		async delete(id) {
			await db.delete(todayItems).where(eq(todayItems.id, id)).run();
		},
	};
}
