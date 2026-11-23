import type { IntegrationManifest } from "@dashboard/core/integration";
import { MICROSOFT_SETUP_GUIDE } from "@dashboard/platform/oauth/microsoft";
import { CalendarDays } from "lucide-react";
import { OUTLOOK_CALENDAR_ID, UPCOMING_DAYS } from "./constants";
import { OutlookEventDetailView } from "./event-detail-view";
import { OutlookCalendarOverview } from "./overview";
import { OutlookUpcomingEventsWidget } from "./widgets/upcoming-events-widget";

export const outlookCalendarManifest: IntegrationManifest = {
	id: OUTLOOK_CALENDAR_ID,
	name: "Outlook Calendar",
	description:
		"Your upcoming meetings from Outlook or Microsoft 365 (read-only access).",
	icon: CalendarDays,
	accent: "#0078d4",
	setup: {
		url: "https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade",
		label:
			"Microsoft Entra → App registrations (uses the Microsoft app registration)",
	},
	setupGuide: MICROSOFT_SETUP_GUIDE,
	details: { Component: OutlookEventDetailView },
	overview: { Component: OutlookCalendarOverview, scoped: true },
	widgets: [
		{
			type: "outlook-calendar.upcoming",
			title: "Upcoming events",
			description: `Your Outlook events for the next ${UPCOMING_DAYS} days, with join links.`,
			integrationId: OUTLOOK_CALENDAR_ID,
			icon: CalendarDays,
			defaultSize: { w: 4, h: 10 },
			minSize: { w: 3, h: 5 },
			scoped: true,
			Component: OutlookUpcomingEventsWidget,
		},
	],
};
