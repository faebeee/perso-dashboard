import type { CalendarEvent } from "@dashboard/core/calendar-event";
import { describe, expect, it } from "vitest";
import { groupByDay } from "./agenda-list";

// Built from local time so the test is time-zone independent.
const at = (day: number, hour: number) =>
	new Date(2026, 0, day, hour).toISOString();

const event = (id: string, start: string, allDay = false): CalendarEvent => ({
	id,
	source: "test",
	title: id,
	url: "#",
	start,
	end: start,
	allDay,
	isOrganizer: true,
});

describe("groupByDay", () => {
	const now = new Date(2026, 0, 5, 12).getTime();

	it("labels today and tomorrow, and folds ongoing events into today", () => {
		const groups = groupByDay(
			[
				event("multi-day", "2026-01-03", true),
				event("lunch", at(5, 13)),
				event("standup", at(6, 9)),
				event("later", at(8, 9)),
			],
			now,
		);
		expect(groups.map((g) => [g.label, g.events.map((e) => e.id)])).toEqual([
			["Today", ["multi-day", "lunch"]],
			["Tomorrow", ["standup"]],
			[expect.stringMatching(/Thursday/), ["later"]],
		]);
	});
});
