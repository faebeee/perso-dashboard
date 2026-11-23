import type { DashboardLayout, LayoutItem } from "#/core/layout";
import type { WidgetDefinition } from "#/core/widget";

/** Pure layout operations: no React, no persistence. */

export const GRID_COLS = 12;

type Position = Pick<LayoutItem, "i" | "x" | "y" | "w" | "h">;

export function newInstanceId(): string {
	return (
		globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
	);
}

/** Lays the catalog out in columns, filling the shortest column first. */
export function buildDefaultLayout(
	catalog: readonly WidgetDefinition[],
): DashboardLayout {
	const columnWidth = 4;
	const columns = GRID_COLS / columnWidth;
	const heights = Array.from({ length: columns }, () => 0);

	return catalog.map((widget) => {
		const column = heights.indexOf(Math.min(...heights));
		const h = widget.defaultSize.h;
		const item: LayoutItem = {
			// Deterministic so the unsaved default is stable across renders/SSR.
			i: `default:${widget.type}`,
			type: widget.type,
			x: column * columnWidth,
			y: heights[column] ?? 0,
			w: Math.min(widget.defaultSize.w, columnWidth),
			h,
		};
		heights[column] = (heights[column] ?? 0) + h;
		return item;
	});
}

/** Appends a widget below everything else. */
export function addWidget(
	layout: DashboardLayout,
	widget: WidgetDefinition,
): DashboardLayout {
	const bottom = Math.max(0, ...layout.map((item) => item.y + item.h));
	return [
		...layout,
		{
			i: newInstanceId(),
			type: widget.type,
			x: 0,
			y: bottom,
			w: widget.defaultSize.w,
			h: widget.defaultSize.h,
		},
	];
}

export function removeWidget(
	layout: DashboardLayout,
	i: string,
): DashboardLayout {
	return layout.filter((item) => item.i !== i);
}

/** Applies positions reported by the grid engine, keeping widget types. */
export function applyPositions(
	layout: DashboardLayout,
	positions: readonly Position[],
): DashboardLayout {
	const byId = new Map(positions.map((p) => [p.i, p]));
	return layout.map((item) => {
		const p = byId.get(item.i);
		return p ? { ...item, x: p.x, y: p.y, w: p.w, h: p.h } : item;
	});
}

export function samePositions(a: DashboardLayout, b: DashboardLayout): boolean {
	if (a.length !== b.length) return false;
	return a.every((item, index) => {
		const other = b[index];
		return (
			other !== undefined &&
			item.i === other.i &&
			item.x === other.x &&
			item.y === other.y &&
			item.w === other.w &&
			item.h === other.h
		);
	});
}
