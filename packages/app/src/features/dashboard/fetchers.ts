import {
	type DashboardLayout,
	dashboardLayoutSchema,
} from "@dashboard/core/layout";
import { getServices } from "@dashboard/platform/services";

/** Single-user app: one layout row. */
const LAYOUT_ID = "default";

export async function fetchDashboardLayout(): Promise<DashboardLayout | null> {
	return (await getServices()).layouts.get(LAYOUT_ID);
}

export async function saveDashboardLayout(
	layout: DashboardLayout,
): Promise<void> {
	await (await getServices()).layouts.save(
		LAYOUT_ID,
		dashboardLayoutSchema.parse(layout),
	);
}
