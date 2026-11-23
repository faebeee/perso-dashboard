import { fakeFetch } from "@dashboard/platform/testing/fake-fetch";
import { describe, expect, it } from "vitest";
import { createGoogleCalendarApi } from "./api/client";
import { googleCalendarListSchema, googleEventSchema } from "./api/schemas";
import { eventDetailRef, parseEventDetailRef } from "./detail";
import { toCalendarEvent } from "./mapper";
import { calendarOptions, createGoogleCalendarService } from "./service";

const raw = (
	id: string,
	start: string,
	extra: Record<string, unknown> = {},
) => ({
	id,
	status: "confirmed",
	htmlLink: `https://calendar.google.com/event?eid=${id}`,
	summary: id,
	start: { dateTime: start },
	end: { dateTime: start.replace("T09", "T10") },
	attendees: [],
	...extra,
});

describe("multiple calendars", () => {
	it("merges selected calendars, primary first, dropping duplicates", async () => {
		const team = "team@group.calendar.google.com";
		const fetch = fakeFetch({
			"/calendar/v3/calendars/primary/events": {
				items: [
					raw("shared", "2026-01-05T09:00:00Z"),
					raw("mine", "2026-01-05T11:00:00Z"),
				],
			},
			[`/calendar/v3/calendars/${encodeURIComponent(team)}/events`]: {
				items: [
					raw("shared", "2026-01-05T09:00:00Z"),
					raw("teamonly", "2026-01-05T08:00:00Z"),
				],
			},
		});
		const service = createGoogleCalendarService(
			createGoogleCalendarApi("t", fetch),
			undefined,
			{
				calendarIds: [team, "primary"],
			},
		);
		const events = await service.between(
			new Date("2026-01-05T00:00:00Z"),
			new Date("2026-01-06T00:00:00Z"),
		);
		expect(events.map((e) => [e.title, e.detailRef])).toEqual([
			["teamonly", `${team}|teamonly`],
			["shared", "shared"], // the primary copy wins
			["mine", "mine"],
		]);
	});

	it("keeps the other calendars when one fails", async () => {
		const fetch = fakeFetch({
			"/calendar/v3/calendars/primary/events": {
				items: [raw("mine", "2026-01-05T11:00:00Z")],
			},
		}); // the second calendar 404s
		const service = createGoogleCalendarService(
			createGoogleCalendarApi("t", fetch),
			undefined,
			{
				calendarIds: ["primary", "gone@group.calendar.google.com"],
			},
		);
		const events = await service.between(new Date(0), new Date("2027-01-01"));
		expect(events.map((e) => e.title)).toEqual(["mine"]);
	});

	it("doesn't treat team-calendar events you're not invited to as yours", () => {
		const event = googleEventSchema.parse(
			raw("planning", "2026-01-05T09:00:00Z"),
		);
		expect(toCalendarEvent(event, "primary")?.isOrganizer).toBe(true);
		expect(
			toCalendarEvent(event, "team@group.calendar.google.com")?.isOrganizer,
		).toBe(false);
	});

	it("round-trips detail refs with the calendar", () => {
		expect(parseEventDetailRef(eventDetailRef("primary", "abc"))).toEqual({
			calendarId: "primary",
			eventId: "abc",
		});
		expect(
			parseEventDetailRef(
				eventDetailRef("t@group.calendar.google.com", "abc_2026"),
			),
		).toEqual({
			calendarId: "t@group.calendar.google.com",
			eventId: "abc_2026",
		});
	});

	it("lists calendars as choices, primary first", () => {
		const options = calendarOptions(
			googleCalendarListSchema.parse({
				items: [
					{
						id: "zz@group.calendar.google.com",
						summary: "Team",
						accessRole: "reader",
						backgroundColor: "#f00",
					},
					{
						id: "me@x.com",
						summary: "me@x.com",
						summaryOverride: "Me",
						primary: true,
						accessRole: "owner",
					},
					{ id: "holidays", summary: "Holidays", accessRole: "reader" },
				],
			}),
		);
		expect(options).toEqual([
			{
				value: "primary",
				label: "Me",
				description: "Yours",
				color: undefined,
				badge: "Primary",
			},
			{
				value: "holidays",
				label: "Holidays",
				description: "Can view · holidays",
				color: undefined,
				badge: undefined,
			},
			{
				value: "zz@group.calendar.google.com",
				label: "Team",
				description: "Can view · zz@group.calendar.google.com",
				color: "#f00",
				badge: undefined,
			},
		]);
	});
});
