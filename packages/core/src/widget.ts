import type { ComponentType } from "react";

export interface WidgetSize {
	w: number;
	h: number;
}

/**
 * A widget type that can be placed on the dashboard. The dashboard only knows
 * this contract; it never imports a concrete widget directly.
 */
export interface WidgetDefinition {
	/** Stable, namespaced id persisted in layouts, e.g. "github.review-requests". */
	type: string;
	title: string;
	description: string;
	/** Owning integration, or undefined for built-in widgets (e.g. the feed). */
	integrationId?: string;
	icon: ComponentType<{ className?: string }>;
	defaultSize: WidgetSize;
	minSize?: WidgetSize;
	/** True when the widget responds to the dashboard's "All / Assigned / Created" filter. */
	scoped?: boolean;
	Component: ComponentType;
}
