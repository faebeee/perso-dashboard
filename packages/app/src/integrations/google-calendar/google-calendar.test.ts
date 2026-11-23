import { fakeFetch } from "@dashboard/platform/testing/fake-fetch";
import { describe, expect, it } from "vitest";
import { createGoogleCalendarApi } from "./api/client";
import { type GoogleEvent, googleEventSchema } from "./api/schemas";
import { toCalendarEvent } from "./mapper";
import { createGoogleCalendarService } from "./service";

const raw = (overrides: Record<string, unknown> = {}) => ({
	id: "evt1",
	status: "confirmed",
	htmlLink: "https://calendar.google.com/event?eid=1",
	summary: "Sprint planning",
	location: "Room 4",
	start: { dateTime: "2026-01-05T09:00:00Z" },
	end: { dateTime: "2026-01-05T10:00:00Z" },
	hangoutLink: "https://meet.google.com/abc-defg-hij",
	organizer: { email: "lead@x.com" },
	attendees: [
		{ email: "lead@x.com", displayName: "Lead", responseStatus: "accepted" },
		{ email: "me@x.com", self: true, responseStatus: "needsAction" },
		{ email: "room-4@resource.x.com", resource: true },
	],
	...overrides,
});

const parse = (overrides?: Record<string, unknown>): GoogleEvent =>
	googleEventSchema.parse(raw(overrides));

describe("google calendar mapper", () => {
	it("maps an invited, timed event", () => {
		expect(toCalendarEvent(parse())).toEqual({
			id: "google-calendar:evt1",
			source: "google-calendar",
			title: "Sprint planning",
			url: "https://calendar.google.com/event?eid=1",
			start: "2026-01-05T09:00:00Z",
			end: "2026-01-05T10:00:00Z",
			allDay: false,
			detailRef: "evt1",
			location: "Room 4",
			meetingUrl: "https://meet.google.com/abc-defg-hij",
			isOrganizer: false,
			response: "needsAction",
			// Not you, not the meeting room.
			attendees: [{ email: "lead@x.com", name: "Lead", response: "accepted" }],
		});
	});

	it("maps all-day events you organize", () => {
		const event = toCalendarEvent(
			parse({
				start: { date: "2026-01-06" },
				end: { date: "2026-01-07" },
				organizer: { self: true },
				attendees: [],
				hangoutLink: undefined,
			}),
		);
		expect(event).toMatchObject({
			allDay: true,
			start: "2026-01-06",
			isOrganizer: true,
			response: undefined,
			meetingUrl: undefined,
		});
	});

	it("uses conference video links when there's no Meet link", () => {
		const event = toCalendarEvent(
			parse({
				hangoutLink: undefined,
				conferenceData: {
					entryPoints: [
						{ entryPointType: "phone", uri: "tel:+1" },
						{ entryPointType: "video", uri: "https://zoom.us/j/1" },
					],
				},
			}),
		);
		expect(event?.meetingUrl).toBe("https://zoom.us/j/1");
	});

	it("drops cancelled and declined events", () => {
		expect(toCalendarEvent(parse({ status: "cancelled" }))).toBeNull();
		expect(
			toCalendarEvent(
				parse({ attendees: [{ self: true, responseStatus: "declined" }] }),
			),
		).toBeNull();
	});
});

describe("google calendar service", () => {
	const now = new Date("2026-01-05T08:00:00Z");
	const fetch = () =>
		fakeFetch({
			"/calendar/v3/calendars/primary/events": {
				items: [
					raw({
						id: "late",
						start: { dateTime: "2026-01-06T12:00:00Z" },
						end: { dateTime: "2026-01-06T13:00:00Z" },
					}),
					raw({ id: "mine", organizer: { self: true }, attendees: [] }),
					raw({ id: "gone", status: "cancelled" }),
				],
			},
		});

	it("requests a 7-day window of expanded events, sorted by start", async () => {
		const f = fetch();
		const events = await createGoogleCalendarService(
			createGoogleCalendarApi("t", f),
			() => now,
		).upcoming("all");

		expect(events.map((e) => e.id)).toEqual([
			"google-calendar:mine",
			"google-calendar:late",
		]);
		const url = new URL(String(f.mock.calls[0]?.[0]));
		expect(url.searchParams.get("timeMin")).toBe("2026-01-05T08:00:00.000Z");
		expect(url.searchParams.get("timeMax")).toBe("2026-01-12T08:00:00.000Z");
		expect(url.searchParams.get("singleEvents")).toBe("true");
	});

	it.each([
		["created", ["google-calendar:mine"]],
		["assigned", ["google-calendar:late"]],
	] as const)("filters scope %s", async (scope, ids) => {
		const events = await createGoogleCalendarService(
			createGoogleCalendarApi("t", fetch()),
			() => now,
		).upcoming(scope);
		expect(events.map((e) => e.id)).toEqual(ids);
	});
});
