import { CalendarDays } from "lucide-react";
import type { IntegrationManifest } from "#/core/integration";
import { GOOGLE_SETUP_GUIDE } from "#/platform/oauth/google";
import { GOOGLE_CALENDAR_ID, UPCOMING_DAYS } from "./constants";
import { EventDetailView } from "./event-detail-view";
import { GoogleCalendarOverview } from "./overview";
import { UpcomingEventsWidget } from "./widgets/upcoming-events-widget";

export const googleCalendarManifest: IntegrationManifest = {
	id: GOOGLE_CALENDAR_ID,
	name: "Google Calendar",
	description: "Your upcoming meetings and events (read-only access).",
	icon: CalendarDays,
	accent: "#188038",
	setup: {
		url: "https://console.cloud.google.com/apis/library/calendar-json.googleapis.com",
		label:
			"Google Cloud Console → enable the Calendar API (uses the Google OAuth client)",
	},
	setupGuide: GOOGLE_SETUP_GUIDE,
	details: { Component: EventDetailView },
	overview: { Component: GoogleCalendarOverview, scoped: true },
	widgets: [
		{
			type: "google-calendar.upcoming",
			title: "Upcoming events",
			description: `Your events for the next ${UPCOMING_DAYS} days, with join links.`,
			integrationId: GOOGLE_CALENDAR_ID,
			icon: CalendarDays,
			defaultSize: { w: 4, h: 10 },
			minSize: { w: 3, h: 5 },
			scoped: true,
			Component: UpcomingEventsWidget,
		},
	],
};
