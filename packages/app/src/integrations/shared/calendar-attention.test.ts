import type { CalendarEvent } from "@dashboard/core/calendar-event";
import { describe, expect, it } from "vitest";
import { eventsToAttention } from "./calendar-attention";

const NOW = new Date(2026, 0, 5, 10, 0);
const minutes = (n: number) =>
	new Date(NOW.getTime() + n * 60_000).toISOString();

const event = (
	id: string,
	startMin: number,
	durationMin = 30,
	extra: Partial<CalendarEvent> = {},
): CalendarEvent => ({
	id,
	source: "google-calendar",
	title: id,
	url: "#",
	start: minutes(startMin),
	end: minutes(startMin + durationMin),
	allDay: false,
	isOrganizer: true,
	...extra,
});

const run = (events: CalendarEvent[]) => eventsToAttention(events, NOW);

describe("calendar attention", () => {
	it("flags ongoing meetings and ones within 15 min as now, with Join", () => {
		const [ongoing, imminent] = run([
			event("ongoing", -10, 30, { meetingUrl: "https://meet/x" }),
			event("imminent", 15),
		]);
		expect(ongoing).toMatchObject({
			urgency: "now",
			reason: "meeting",
			label: "Happening now",
			action: { label: "Join", url: "https://meet/x" },
		});
		expect(imminent).toMatchObject({ urgency: "now", label: "Starts in 15m" });
	});

	it("flags meetings within 2h as today and ignores later ones", () => {
		const items = run([
			event("soon", 16),
			event("edge", 120),
			event("later", 121),
		]);
		expect(items.map((i) => [i.title, i.urgency])).toEqual([
			["soon", "today"],
			["edge", "today"],
		]);
	});

	it("ignores finished meetings", () => {
		expect(run([event("done", -60, 30)])).toEqual([]);
	});

	it("flags unanswered invitations within 48h, today when within 24h", () => {
		const invite = { response: "needsAction" as const, isOrganizer: false };
		const items = run([
			event("tomorrow-morning", 20 * 60, 30, invite),
			event("day-after", 40 * 60, 30, invite),
			event("next-week", 72 * 60, 30, invite),
		]);
		expect(items.map((i) => [i.title, i.reason, i.urgency])).toEqual([
			["tomorrow-morning", "invitation", "today"],
			["day-after", "invitation", "soon"],
		]);
	});

	it("keeps one item for an unanswered meeting that starts soon", () => {
		const [item, ...rest] = run([
			event("both", 30, 30, { response: "needsAction", isOrganizer: false }),
		]);
		expect(rest).toEqual([]);
		expect(item).toMatchObject({
			reason: "meeting",
			label: "Starts in 30m · not answered",
		});
	});

	it("never treats all-day events as meetings", () => {
		const allDay = event("holiday", -60, 24 * 60, {
			allDay: true,
			start: "2026-01-05",
			end: "2026-01-06",
		});
		expect(run([allDay])).toEqual([]);
	});
});
