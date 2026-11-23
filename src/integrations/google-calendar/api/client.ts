import { createHttpClient, type FetchFn } from "#/platform/http";
import { GOOGLE_CALENDAR_ID } from "../constants";
import { googleCalendarSchema, googleEventListSchema } from "./schemas";

/** Thin wrapper over the Google Calendar v3 REST API. */
export function createGoogleCalendarApi(accessToken: string, fetch?: FetchFn) {
	const http = createHttpClient({
		integrationId: GOOGLE_CALENDAR_ID,
		baseUrl: "https://www.googleapis.com",
		accessToken,
		fetch,
	});

	return {
		primaryCalendar: () =>
			http.get("/calendar/v3/calendars/primary", googleCalendarSchema),

		/** Expanded (single) events in [from, to), ordered by start time. */
		listEvents: (from: Date, to: Date, maxResults = 50) =>
			http.get("/calendar/v3/calendars/primary/events", googleEventListSchema, {
				timeMin: from.toISOString(),
				timeMax: to.toISOString(),
				singleEvents: "true",
				orderBy: "startTime",
				maxResults,
			}),
	};
}

export type GoogleCalendarApi = ReturnType<typeof createGoogleCalendarApi>;
