import { describe, expect, it } from "vitest";
import {
	countPerWeek,
	lastWeeks,
	median,
	medianPerWeek,
	startOfWeek,
	summaryRange,
} from "./insights";

const NOW = new Date(2026, 0, 14, 15, 0); // Wednesday

describe("weeks", () => {
	it("starts weeks on Monday", () => {
		expect(startOfWeek(NOW)).toEqual(new Date(2026, 0, 12));
		expect(startOfWeek(new Date(2026, 0, 18, 23))).toEqual(
			new Date(2026, 0, 12),
		); // Sunday
	});

	it("lists the last weeks oldest first, ending with the current one", () => {
		const weeks = lastWeeks(3, NOW);
		expect(weeks.map((w) => w.start)).toEqual([
			new Date(2025, 11, 29),
			new Date(2026, 0, 5),
			new Date(2026, 0, 12),
		]);
		expect(weeks[2]?.end).toEqual(new Date(2026, 0, 19));
	});

	it("counts and takes medians per week", () => {
		const weeks = lastWeeks(2, NOW);
		const d = (day: number) => new Date(2026, 0, day, 12);
		expect(countPerWeek([d(5), d(6), d(13), d(1)], weeks)).toEqual([2, 1]);
		expect(
			medianPerWeek(
				[
					{ at: d(5), value: 1 },
					{ at: d(6), value: 3 },
					{ at: d(7), value: 10 },
				],
				weeks,
			),
		).toEqual([3, null]);
		expect(median([4, 1, 3, 2])).toBe(2.5);
	});
});

describe("summaryRange", () => {
	it("covers since yesterday on a normal weekday", () => {
		expect(summaryRange("since_last_workday", NOW)).toMatchObject({
			from: new Date(2026, 0, 13),
			to: NOW,
			title: "Since yesterday",
		});
	});

	it("goes back to Friday on Mondays", () => {
		const monday = new Date(2026, 0, 12, 9);
		const range = summaryRange("since_last_workday", monday);
		expect(range.from).toEqual(new Date(2026, 0, 9));
		expect(range.title).toMatch(/^Since /);
	});

	it("covers the last 24 hours", () => {
		expect(summaryRange("last_24_hours", NOW)).toMatchObject({
			from: new Date(2026, 0, 13, 15, 0),
			to: NOW,
		});
	});

	it("covers this and last week", () => {
		expect(summaryRange("this_week", NOW).from).toEqual(new Date(2026, 0, 12));
		expect(summaryRange("last_week", NOW)).toMatchObject({
			from: new Date(2026, 0, 5),
			to: new Date(2026, 0, 12),
		});
	});
});
