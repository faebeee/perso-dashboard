import { z } from "zod";

/** One placed widget on the dashboard grid. */
export const layoutItemSchema = z.object({
	/** Unique instance id (a widget type can be placed more than once). */
	i: z.string(),
	/** WidgetDefinition.type */
	type: z.string(),
	x: z.number().int().min(0),
	y: z.number().int().min(0),
	w: z.number().int().min(1),
	h: z.number().int().min(1),
});

export const dashboardLayoutSchema = z.array(layoutItemSchema);

export type LayoutItem = z.infer<typeof layoutItemSchema>;
export type DashboardLayout = z.infer<typeof dashboardLayoutSchema>;
