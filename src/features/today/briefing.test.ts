import { describe, expect, it } from "vitest";
import type { AttentionItem } from "#/core/attention";
import type { CalendarEvent } from "#/core/calendar-event";
import { briefingSummary, buildBriefing, workdayOn } from "./briefing";

const at = (h: number, m = 0) => new Date(2026, 0, 7, h, m);
const event = (id: string, start: Date, end: Date): CalendarEvent => ({
	id,
	source: "google-calendar",
	title: id,
	url: "#",
	start: start.toISOString(),
	end: end.toISOString(),
	allDay: false,
	isOrganizer: true,
});
const urgent = (
	id: string,
	reason: AttentionItem["reason"],
): AttentionItem => ({
	id,
	source: "x",
	reason,
	urgency: "today",
	title: id,
	url: "#",
	at: at(8).toISOString(),
	label: "",
});

describe("buildBriefing", () => {
	const workday = workdayOn(at(0), 9 * 60, 18 * 60);
	const briefing = buildBriefing(
		[event("standup", at(9, 30), at(9, 45)), event("planning", at(14), at(15))],
		[
			urgent("bug", "overdue"),
			urgent("pr", "review_requested"),
			urgent("invite", "invitation"),
			urgent("crash", "production_error"),
			urgent("mail", "important_email"),
		],
		workday,
		at(9),
	);

	it("collects meetings, free time and what's due or waiting", () => {
		expect(briefing.meetings.map((m) => m.id)).toEqual(["standup", "planning"]);
		expect(briefing.meetingMinutes).toBe(75);
		expect(briefing.nextMeeting?.id).toBe("standup");
		expect(briefing.freeMinutes).toBe(30 + 255 + 180);
		expect(briefing.due.map((i) => i.id)).toEqual(["bug"]);
		expect(briefing.waitingOnYou.map((i) => i.id)).toEqual(["pr", "invite"]);
		expect(briefing.errors.map((i) => i.id)).toEqual(["crash"]);
	});

	it("summarises it in one line", () => {
		expect(briefingSummary(briefing)).toBe(
			"2 meetings (1h 15m) · 7h 45m free · 1 due · 2 things waiting on you · 1 urgent error",
		);
	});

	it("summarises an empty day", () => {
		expect(briefingSummary(buildBriefing([], [], workday, at(19)))).toBe(
			"No meetings",
		);
	});
});
