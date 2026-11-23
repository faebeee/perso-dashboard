import { TTL, ttlByPath } from "@dashboard/platform/cache-ttl";
import { createHttpClient, type FetchFn } from "@dashboard/platform/http";
import { GOOGLE_CALENDAR_ID } from "../constants";
import {
	googleCalendarListSchema,
	googleCalendarSchema,
	googleEventDetailSchema,
	googleEventListSchema,
} from "./schemas";

/** "primary" or a calendar id (usually an email address). */
const calendarPath = (calendarId: string) =>
	`/calendar/v3/calendars/${encodeURIComponent(calendarId)}`;

/** Thin wrapper over the Google Calendar v3 REST API. */
export function createGoogleCalendarApi(accessToken: string, fetch?: FetchFn) {
	const http = createHttpClient({
		integrationId: GOOGLE_CALENDAR_ID,
		baseUrl: "https://www.googleapis.com",
		accessToken,
		fetch,
		ttl: ttlByPath(
			[
				[/\/calendars\/primary$/, TTL.stable],
				[/\/calendarList$/, TTL.slow],
			],
			TTL.list,
		),
	});

	return {
		primaryCalendar: () =>
			http.get("/calendar/v3/calendars/primary", googleCalendarSchema),

		/** Every calendar in your list (yours, shared with you, subscribed). */
		calendarList: () =>
			http.get("/calendar/v3/users/me/calendarList", googleCalendarListSchema),

		/** One event with description and attendees (detail view). */
		event: (calendarId: string, id: string) =>
			http.get(
				`${calendarPath(calendarId)}/events/${encodeURIComponent(id)}`,
				googleEventDetailSchema,
			),

		/** Expanded (single) events in [from, to), ordered by start time. */
		listEvents: (calendarId: string, from: Date, to: Date, maxResults = 50) =>
			http.get(`${calendarPath(calendarId)}/events`, googleEventListSchema, {
				timeMin: from.toISOString(),
				timeMax: to.toISOString(),
				singleEvents: "true",
				orderBy: "startTime",
				maxResults,
			}),
	};
}

export type GoogleCalendarApi = ReturnType<typeof createGoogleCalendarApi>;
