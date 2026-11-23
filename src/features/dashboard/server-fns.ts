import { createServerFn } from "@tanstack/react-start";
import { type DashboardLayout, dashboardLayoutSchema } from "#/core/layout";
import { getServices } from "#/server/services";

/** Single-user app: one layout row. */
const LAYOUT_ID = "default";

export const fetchDashboardLayout = createServerFn({ method: "GET" }).handler(
	(): Promise<DashboardLayout | null> => getServices().layouts.get(LAYOUT_ID),
);

export const saveDashboardLayout = createServerFn({ method: "POST" })
	.validator(dashboardLayoutSchema)
	.handler(async ({ data }) => {
		await getServices().layouts.save(LAYOUT_ID, data);
	});
