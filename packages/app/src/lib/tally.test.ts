import { describe, expect, it } from "vitest";
import { tally } from "./tally";
import { formatDuration } from "./time";

describe("tally", () => {
	it("counts by key, highest first, skipping missing keys", () => {
		expect(tally(["a", "b", "a", undefined, "c", "b", "a"], (x) => x)).toEqual([
			{ label: "a", value: 3 },
			{ label: "b", value: 2 },
			{ label: "c", value: 1 },
		]);
	});

	it("sums a weight and breaks ties by label", () => {
		const rows = tally(
			[
				{ k: "y", w: 2 },
				{ k: "x", w: 2 },
			],
			(i) => i.k,
			(i) => i.w,
		);
		expect(rows).toEqual([
			{ label: "x", value: 2 },
			{ label: "y", value: 2 },
		]);
	});
});

describe("formatDuration", () => {
	it.each([
		[0, "0m"],
		[45, "45m"],
		[60, "1h"],
		[150, "2h 30m"],
		[-5, "0m"],
	])("%i → %s", (minutes, expected) => {
		expect(formatDuration(minutes)).toBe(expected);
	});
});
