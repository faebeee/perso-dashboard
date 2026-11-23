import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "#/core/calendar-event";
import { summarizeEvents } from "./summary";

// Local times, so the test is independent of the machine's time zone.
const at = (day: number, hour: number, minute = 0) =>
	new Date(2026, 0, day, hour, minute).toISOString();

const event = (
	id: string,
	start: string,
	end: string,
	extra: Partial<CalendarEvent> = {},
): CalendarEvent => ({
	id,
	source: "google-calendar",
	title: id,
	url: "#",
	start,
	end,
	allDay: false,
	isOrganizer: false,
	...extra,
});

const NOW = new Date(2026, 0, 5, 10, 0).getTime();

describe("summarizeEvents", () => {
	const events = [
		event("ongoing", at(5, 9, 30), at(5, 10, 30)),
		event("later-today", at(5, 14), at(5, 15), { response: "needsAction" }),
		event("holiday", "2026-01-06", "2026-01-07", { allDay: true }),
		event("tomorrow", at(6, 9), at(6, 9, 30)),
	];
	const summary = summarizeEvents(events, NOW);

	it("splits today from later days", () => {
		expect(summary.today.map((e) => e.id)).toEqual(["ongoing", "later-today"]);
		expect(summary.later.map((e) => e.id)).toEqual(["holiday", "tomorrow"]);
	});

	it("picks the next timed event that hasn't started", () => {
		expect(summary.next?.id).toBe("later-today");
	});

	it("totals meeting time, ignoring all-day events", () => {
		expect(summary.meetingCount).toBe(3);
		expect(summary.meetingMinutes).toBe(60 + 60 + 30);
		expect(summary.minutesByDay).toEqual([
			{ label: "Today", value: 120 },
			{ label: "Tomorrow", value: 30 },
		]);
	});

	it("counts unanswered invitations", () => {
		expect(summary.awaitingReply).toBe(1);
	});

	it("handles an empty calendar", () => {
		expect(summarizeEvents([], NOW)).toMatchObject({
			today: [],
			later: [],
			next: undefined,
			meetingMinutes: 0,
			minutesByDay: [],
		});
	});
});
