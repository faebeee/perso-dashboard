import { TTL, ttlByPath } from "@dashboard/platform/cache-ttl";
import { createHttpClient, type FetchFn } from "@dashboard/platform/http";
import { DEFAULT_CALENDAR, OUTLOOK_CALENDAR_ID } from "../constants";
import {
	graphCalendarListSchema,
	graphEventListSchema,
	graphEventSchema,
	graphUserSchema,
} from "./schemas";

const EVENT_FIELDS = [
	"id",
	"subject",
	"webLink",
	"isAllDay",
	"isCancelled",
	"isOrganizer",
	"start",
	"end",
	"location",
	"onlineMeeting",
	"onlineMeetingUrl",
	"responseStatus",
	"organizer",
	"attendees",
].join(",");

/** Your default calendar, or one of your calendar list by id. */
const calendarPath = (calendarId: string) =>
	calendarId === DEFAULT_CALENDAR
		? "/v1.0/me/calendar"
		: `/v1.0/me/calendars/${encodeURIComponent(calendarId)}`;

/** Thin wrapper over Microsoft Graph calendar endpoints (signed-in user). */
export function createOutlookCalendarApi(accessToken: string, fetch?: FetchFn) {
	const http = createHttpClient({
		integrationId: OUTLOOK_CALENDAR_ID,
		baseUrl: "https://graph.microsoft.com",
		accessToken,
		fetch,
		// Every time comes back in UTC (as "…T09:00:00.0000000", no offset).
		headers: { Prefer: 'outlook.timezone="UTC"' },
		ttl: ttlByPath(
			[
				[/\/v1\.0\/me$/, TTL.stable],
				[/\/me\/calendars$/, TTL.slow],
			],
			TTL.list,
		),
	});

	return {
		me: () =>
			http.get("/v1.0/me", graphUserSchema, {
				$select: "mail,userPrincipalName",
			}),

		/** Your calendars: yours, and ones shared with you that you added. */
		calendars: () =>
			http.get("/v1.0/me/calendars", graphCalendarListSchema, {
				$select: "id,name,hexColor,isDefaultCalendar,canEdit,owner",
				$top: 100,
			}),

		/** Expanded (single) events overlapping [from, to), by start time. */
		calendarView: (calendarId: string, from: Date, to: Date, top = 100) =>
			http.get(
				`${calendarPath(calendarId)}/calendarView`,
				graphEventListSchema,
				{
					startDateTime: from.toISOString(),
					endDateTime: to.toISOString(),
					$orderby: "start/dateTime",
					$select: EVENT_FIELDS,
					$top: top,
				},
			),

		/** One event with its description (detail view). */
		event: (calendarId: string, id: string) =>
			http.get(
				`${calendarPath(calendarId)}/events/${encodeURIComponent(id)}`,
				graphEventSchema,
				{ $select: `${EVENT_FIELDS},body` },
			),
	};
}

export type OutlookCalendarApi = ReturnType<typeof createOutlookCalendarApi>;
