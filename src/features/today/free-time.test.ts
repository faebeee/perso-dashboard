import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "#/core/calendar-event";
import { freeBlocks, meetingMinutes } from "./free-time";

const at = (h: number, m = 0) => new Date(2026, 0, 7, h, m);
const event = (start: Date, end: Date, allDay = false): CalendarEvent => ({
	id: `${start.getTime()}`,
	source: "google-calendar",
	title: "x",
	url: "#",
	start: start.toISOString(),
	end: end.toISOString(),
	allDay,
	isOrganizer: true,
});
const workday = { start: at(9), end: at(18) };
const spans = (blocks: ReturnType<typeof freeBlocks>) =>
	blocks.map(
		(b) =>
			`${b.start.getHours()}:${String(b.start.getMinutes()).padStart(2, "0")}-${b.end.getHours()}:${String(b.end.getMinutes()).padStart(2, "0")}`,
	);

describe("freeBlocks", () => {
	it("finds gaps between meetings, merging overlaps", () => {
		const events = [
			event(at(10), at(11)),
			event(at(10, 30), at(11, 30)), // overlaps
			event(at(13), at(14)),
			event(at(14), at(14, 20)), // back-to-back
		];
		expect(spans(freeBlocks(events, workday, at(8)))).toEqual([
			"9:00-10:00",
			"11:30-13:00",
			"14:20-18:00",
		]);
	});

	it("ignores gaps shorter than the minimum, all-day events and the past", () => {
		const events = [
			event(at(9), at(18), true), // all-day: doesn't block
			event(at(12), at(12, 40)),
			event(at(13), at(17, 45)),
		];
		expect(spans(freeBlocks(events, workday, at(11, 50)))).toEqual([]);
		expect(spans(freeBlocks(events, workday, at(11)))).toEqual(["11:00-12:00"]);
	});

	it("returns nothing after the workday", () => {
		expect(freeBlocks([], workday, at(19))).toEqual([]);
	});
});

describe("meetingMinutes", () => {
	it("sums timed events clipped to the day", () => {
		const day = { start: at(0), end: at(23, 59) };
		expect(
			meetingMinutes(
				[
					event(at(10), at(11)),
					event(at(9), at(18), true),
					event(at(23), at(23, 59)),
				],
				day,
			),
		).toBe(60 + 59);
	});
});
