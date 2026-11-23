import type { Dismissal } from "@dashboard/core/dismissal";
import { eq, lte } from "drizzle-orm";
import type { AppDatabase } from "../db/client";
import { itemDismissals } from "../db/schema";

export interface DismissalRepository {
	/** Active dismissals; expired snoozes are cleaned up on the way. */
	list(now: Date): Promise<Dismissal[]>;
	save(dismissal: Dismissal): Promise<void>;
	delete(itemId: string): Promise<void>;
}

export function createDrizzleDismissalRepository(
	db: AppDatabase,
): DismissalRepository {
	return {
		async list(now) {
			await db
				.delete(itemDismissals)
				.where(lte(itemDismissals.until, now))
				.run();
			const rows = await db.select().from(itemDismissals).all();
			return rows.map(({ itemId, mode, until, fingerprint }) => ({
				itemId,
				mode,
				until,
				fingerprint,
			}));
		},

		async save(dismissal) {
			const values = {
				mode: dismissal.mode,
				until: dismissal.until,
				fingerprint: dismissal.fingerprint,
				createdAt: new Date(),
			};
			await db
				.insert(itemDismissals)
				.values({ itemId: dismissal.itemId, ...values })
				.onConflictDoUpdate({ target: itemDismissals.itemId, set: values })
				.run();
		},

		async delete(itemId) {
			await db
				.delete(itemDismissals)
				.where(eq(itemDismissals.itemId, itemId))
				.run();
		},
	};
}
