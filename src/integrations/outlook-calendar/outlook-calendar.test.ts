import { describe, expect, it } from "vitest";
import { fakeFetch } from "#/test/fake-fetch";
import { createOutlookCalendarApi } from "./api/client";
import type { GraphEvent } from "./api/schemas";
import { toEventDetail } from "./detail";
import { parseEventDetailRef, toCalendarEvent } from "./mapper";
import { calendarOptions, createOutlookCalendarService } from "./service";

const ME = "me@acme.ch";

const graphEvent = (extra: Partial<GraphEvent> = {}): GraphEvent => ({
	id: "e1",
	subject: "Sprint review",
	webLink: "https://outlook.office365.com/owa/?itemid=e1",
	isAllDay: false,
	isCancelled: false,
	isOrganizer: false,
	start: { dateTime: "2026-01-12T09:00:00.0000000", timeZone: "UTC" },
	end: { dateTime: "2026-01-12T10:00:00.0000000", timeZone: "UTC" },
	location: { displayName: "Room 1" },
	onlineMeeting: { joinUrl: "https://teams.microsoft.com/l/meetup-join/1" },
	responseStatus: { response: "notResponded" },
	organizer: { emailAddress: { name: "Jane", address: "jane@acme.ch" } },
	attendees: [
		{
			type: "required",
			status: { response: "accepted" },
			emailAddress: { name: "Bob", address: "bob@acme.ch" },
		},
		{
			type: "required",
			status: { response: "none" },
			emailAddress: { name: "Me", address: "ME@acme.ch" },
		},
		{
			type: "resource",
			status: { response: "accepted" },
			emailAddress: { name: "Room 1", address: "room1@acme.ch" },
		},
	],
	...extra,
});

describe("outlook calendar mapper", () => {
	it("maps an invitation, in UTC, without you and rooms as attendees", () => {
		expect(toCalendarEvent(graphEvent(), "primary", ME)).toEqual({
			id: "outlook-calendar:e1",
			source: "outlook-calendar",
			title: "Sprint review",
			url: "https://outlook.office365.com/owa/?itemid=e1",
			start: "2026-01-12T09:00:00.000Z",
			end: "2026-01-12T10:00:00.000Z",
			allDay: false,
			detailRef: "e1",
			location: "Room 1",
			meetingUrl: "https://teams.microsoft.com/l/meetup-join/1",
			isOrganizer: false,
			response: "needsAction",
			attendees: [{ email: "bob@acme.ch", name: "Bob", response: "accepted" }],
		});
	});

	it("drops declined and cancelled events", () => {
		expect(
			toCalendarEvent(graphEvent({ responseStatus: { response: "declined" } })),
		).toBeNull();
		expect(toCalendarEvent(graphEvent({ isCancelled: true }))).toBeNull();
	});

	it("keeps all-day events as dates and your own events without a reply", () => {
		const event = toCalendarEvent(
			graphEvent({
				isAllDay: true,
				isOrganizer: true,
				responseStatus: { response: "organizer" },
				start: { dateTime: "2026-01-12T00:00:00.0000000" },
				end: { dateTime: "2026-01-13T00:00:00.0000000" },
			}),
			"cal-2",
		);
		expect(event).toMatchObject({
			start: "2026-01-12",
			end: "2026-01-13",
			allDay: true,
			isOrganizer: true,
			response: undefined,
			detailRef: "cal-2|e1",
		});
		expect(parseEventDetailRef("cal-2|e1")).toEqual({
			calendarId: "cal-2",
			eventId: "e1",
		});
	});

	it("builds the detail view with your reply and the organizer", () => {
		const detail = toEventDetail(
			graphEvent({
				responseStatus: { response: "tentativelyAccepted" },
				attendees: [
					...(graphEvent().attendees ?? []),
					{
						type: "optional",
						status: { response: "none" },
						emailAddress: { name: "Jane", address: "jane@acme.ch" },
					},
				],
				body: { contentType: "html", content: "<p>Agenda</p>" },
			}),
			ME,
		);
		expect(detail.organizer).toEqual({
			name: "Jane",
			email: "jane@acme.ch",
			you: false,
		});
		expect(
			detail.attendees.map((a) => [a.name, a.response, a.you, a.organizer]),
		).toEqual([
			["Bob", "accepted", false, false],
			["Me", "tentative", true, false],
			["Jane", "needsAction", false, true],
		]);
		expect(detail.descriptionHtml).toBe("<p>Agenda</p>");
	});
});

describe("outlook calendar service", () => {
	it("merges selected calendars, asks for UTC, and survives a failing one", async () => {
		const fetch = fakeFetch({
			"/v1.0/me/calendar/calendarView": {
				value: [graphEvent({ id: "a" }), graphEvent({ id: "shared" })],
			},
			"/v1.0/me/calendars/team/calendarView": {
				value: [
					graphEvent({
						id: "shared",
						start: { dateTime: "2026-01-12T08:00:00.0000000" },
					}),
				],
			},
			// "gone" → 404
		});
		const events = await createOutlookCalendarService(
			createOutlookCalendarApi("t", fetch),
			() => new Date("2026-01-12T00:00:00Z"),
			{ calendarIds: ["team", "gone", "primary"], accountEmail: ME },
		).upcoming("all");
		expect(events.map((e) => e.id)).toEqual([
			"outlook-calendar:a",
			"outlook-calendar:shared",
		]);
		// The default calendar wins for duplicates.
		expect(events[1]?.start).toBe("2026-01-12T09:00:00.000Z");
		const headers = new Headers(fetch.mock.calls[0]?.[1]?.headers);
		expect(headers.get("Prefer")).toBe('outlook.timezone="UTC"');
	});

	it("offers your calendars, the default one first", () => {
		expect(
			calendarOptions({
				value: [
					{ id: "x", name: "Team", canEdit: false, hexColor: "#ff0000" },
					{ id: "d", name: "Calendar", isDefaultCalendar: true, canEdit: true },
				],
			}).map((o) => [o.value, o.label, o.badge, o.color]),
		).toEqual([
			["primary", "Calendar", "Default", undefined],
			["x", "Team", undefined, "#ff0000"],
		]);
	});
});
