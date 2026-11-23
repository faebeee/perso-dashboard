import type { IntegrationManifest } from "@dashboard/core/integration";
import { MICROSOFT_SETUP_GUIDE } from "@dashboard/platform/oauth/microsoft";
import { Mail } from "lucide-react";
import { createWorkItemWidget } from "#/components/widget-kit/create-work-item-widget";
import { OUTLOOK_ID } from "./constants";
import { OutlookEmailDetailView } from "./email-detail-view";
import { OutlookOverview } from "./overview";
import { outlookQueries } from "./queries";

export const outlookManifest: IntegrationManifest = {
	id: OUTLOOK_ID,
	name: "Outlook",
	description:
		"Unread messages in your Outlook or Microsoft 365 inbox (read-only access).",
	icon: Mail,
	accent: "#0f6cbd",
	setup: {
		url: "https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade",
		label: "Microsoft Entra → App registrations",
	},
	setupGuide: MICROSOFT_SETUP_GUIDE,
	details: { Component: OutlookEmailDetailView },
	overview: { Component: OutlookOverview },
	widgets: [
		createWorkItemWidget({
			type: "outlook.unread",
			title: "Unread email",
			description: "Unread messages in your Outlook inbox.",
			integrationId: OUTLOOK_ID,
			icon: Mail,
			query: outlookQueries.unread,
			emptyMessage: "Inbox zero. 🎉",
		}),
	],
};
