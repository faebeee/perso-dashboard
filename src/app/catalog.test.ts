import { describe, expect, it } from "vitest";
import { GRID_COLS } from "#/features/dashboard/model";
import { defaultDashboard, widgetCatalog } from "./catalog";

describe("default dashboard", () => {
	it("only places widgets that exist, within the grid and their minimum size", () => {
		const byType = new Map(widgetCatalog.map((w) => [w.type, w]));
		for (const p of defaultDashboard) {
			const widget = byType.get(p.type);
			expect(widget, p.type).toBeDefined();
			expect(p.x + p.w, p.type).toBeLessThanOrEqual(GRID_COLS);
			expect(p.w, p.type).toBeGreaterThanOrEqual(widget?.minSize?.w ?? 1);
			expect(p.h, p.type).toBeGreaterThanOrEqual(widget?.minSize?.h ?? 1);
		}
	});
});
