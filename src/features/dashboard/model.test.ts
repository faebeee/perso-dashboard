import { describe, expect, it } from "vitest";
import type { WidgetDefinition } from "#/core/widget";
import {
	addWidget,
	applyPositions,
	buildDefaultLayout,
	removeWidget,
	samePositions,
} from "./model";

const widget = (type: string, h = 8): WidgetDefinition => ({
	type,
	title: type,
	description: "",
	icon: () => null,
	defaultSize: { w: 4, h },
	Component: () => null,
});

describe("dashboard layout model", () => {
	it("builds a deterministic default layout filling the shortest column", () => {
		const layout = buildDefaultLayout([
			widget("a", 12),
			widget("b"),
			widget("c"),
			widget("d"),
		]);
		expect(layout.map(({ type, x, y }) => ({ type, x, y }))).toEqual([
			{ type: "a", x: 0, y: 0 },
			{ type: "b", x: 4, y: 0 },
			{ type: "c", x: 8, y: 0 },
			{ type: "d", x: 4, y: 8 },
		]);
		expect(buildDefaultLayout([widget("a")])[0]?.i).toBe("default:a");
	});

	it("adds new widgets below everything else", () => {
		const layout = buildDefaultLayout([widget("a", 6)]);
		const next = addWidget(layout, widget("b"));
		expect(next).toHaveLength(2);
		expect(next[1]).toMatchObject({ type: "b", x: 0, y: 6 });
		expect(next[1]?.i).not.toBe(next[0]?.i);
	});

	it("removes by instance id", () => {
		const layout = buildDefaultLayout([widget("a"), widget("b")]);
		expect(removeWidget(layout, "default:a").map((i) => i.type)).toEqual(["b"]);
	});

	it("applies grid positions without touching widget types", () => {
		const layout = buildDefaultLayout([widget("a")]);
		const next = applyPositions(layout, [
			{ i: "default:a", x: 2, y: 3, w: 5, h: 6 },
		]);
		expect(next[0]).toEqual({
			i: "default:a",
			type: "a",
			x: 2,
			y: 3,
			w: 5,
			h: 6,
		});
		expect(samePositions(layout, next)).toBe(false);
		expect(samePositions(next, applyPositions(next, []))).toBe(true);
	});
});
