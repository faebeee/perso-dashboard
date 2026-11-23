import type { ReactNode } from "react";
import GridLayout, { type Layout, useContainerWidth } from "react-grid-layout";
import type { LayoutItem } from "#/core/layout";
import type { WidgetSize } from "#/core/widget";
import { GRID_COLS } from "../model";

/**
 * The only file that knows about react-grid-layout. Swapping the grid
 * engine means re-implementing this component's props, nothing else.
 */

export const DRAG_HANDLE_CLASS = "widget-drag-handle";

const ROW_HEIGHT = 32;
const MARGIN = [16, 16] as const;
const STACK_BREAKPOINT = 768;

type Position = Pick<LayoutItem, "i" | "x" | "y" | "w" | "h">;

interface DashboardGridProps {
	items: readonly LayoutItem[];
	editing: boolean;
	minSizeOf: (item: LayoutItem) => WidgetSize | undefined;
	onPositionsChange: (positions: Position[]) => void;
	renderItem: (item: LayoutItem) => ReactNode;
}

export function DashboardGrid({
	items,
	editing,
	minSizeOf,
	onPositionsChange,
	renderItem,
}: DashboardGridProps) {
	const { width, containerRef, mounted } = useContainerWidth({
		measureBeforeMount: true,
	});

	const stacked = mounted && width < STACK_BREAKPOINT;
	const layout: Layout = items.map((item) => {
		const min = minSizeOf(item);
		return {
			i: item.i,
			x: item.x,
			y: item.y,
			w: item.w,
			h: item.h,
			minW: min?.w,
			minH: min?.h,
		};
	});

	return (
		<div ref={containerRef}>
			{mounted &&
				(stacked ? (
					<div className="flex flex-col gap-4">
						{[...items]
							.sort((a, b) => a.y - b.y || a.x - b.x)
							.map((item) => (
								<div key={item.i} style={{ height: item.h * ROW_HEIGHT }}>
									{renderItem(item)}
								</div>
							))}
					</div>
				) : (
					<GridLayout
						width={width}
						layout={layout}
						gridConfig={{
							cols: GRID_COLS,
							rowHeight: ROW_HEIGHT,
							margin: MARGIN,
							containerPadding: [0, 0],
						}}
						dragConfig={{ enabled: editing, handle: `.${DRAG_HANDLE_CLASS}` }}
						resizeConfig={{ enabled: editing, handles: ["se"] }}
						onLayoutChange={(next) =>
							onPositionsChange(
								next.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })),
							)
						}
					>
						{items.map((item) => (
							<div key={item.i}>{renderItem(item)}</div>
						))}
					</GridLayout>
				))}
		</div>
	);
}
