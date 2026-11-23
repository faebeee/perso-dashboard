import { Mail } from "lucide-react";
import { createWorkItemWidget } from "#/components/widget-kit/create-work-item-widget";
import type { IntegrationManifest } from "#/core/integration";
import { GMAIL_ID } from "./constants";
import { gmailQueries } from "./queries";

export const gmailManifest: IntegrationManifest = {
	id: GMAIL_ID,
	name: "Gmail",
	description: "Unread messages in your inbox (read-only access).",
	icon: Mail,
	setup: {
		url: "https://console.cloud.google.com/apis/credentials",
		label: "Google Cloud Console → Credentials (enable the Gmail API)",
	},
	widgets: [
		createWorkItemWidget({
			type: "gmail.unread",
			title: "Unread email",
			description: "Unread messages in your Gmail inbox.",
			integrationId: GMAIL_ID,
			icon: Mail,
			query: gmailQueries.unread,
			emptyMessage: "Inbox zero. 🎉",
		}),
	],
};
