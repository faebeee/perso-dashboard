import "@tanstack/react-start/server-only";
import { eq } from "drizzle-orm";
import { type DashboardLayout, dashboardLayoutSchema } from "#/core/layout";
import type { AppDatabase } from "../db/client";
import { dashboardLayouts } from "../db/schema";

export interface LayoutRepository {
	/** null when the user has never saved a layout. */
	get(id: string): Promise<DashboardLayout | null>;
	save(id: string, layout: DashboardLayout): Promise<void>;
}

export function createDrizzleLayoutRepository(
	db: AppDatabase,
): LayoutRepository {
	return {
		async get(id) {
			const row = db
				.select()
				.from(dashboardLayouts)
				.where(eq(dashboardLayouts.id, id))
				.get();
			if (!row) return null;
			const parsed = dashboardLayoutSchema.safeParse(row.items);
			// A corrupt layout falls back to the default rather than breaking the page.
			return parsed.success ? parsed.data : null;
		},

		async save(id, layout) {
			const values = { items: layout, updatedAt: new Date() };
			db.insert(dashboardLayouts)
				.values({ id, ...values })
				.onConflictDoUpdate({ target: dashboardLayouts.id, set: values })
				.run();
		},
	};
}
