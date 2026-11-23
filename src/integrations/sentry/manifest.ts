import { Bug, Flame } from "lucide-react";
import { createWorkItemWidget } from "#/components/widget-kit/create-work-item-widget";
import type { IntegrationManifest } from "#/core/integration";
import { SENTRY_ID } from "./constants";
import { SentryOverview } from "./overview";
import { sentryQueries } from "./queries";

export const sentryManifest: IntegrationManifest = {
	id: SENTRY_ID,
	name: "Sentry",
	description:
		"Unresolved errors assigned to you or your teams, plus what's new, escalating or regressed.",
	icon: Bug,
	accent: "#c2459c",
	setup: {
		url: "https://sentry.io/settings/account/api/applications/",
		label: "Sentry → User Settings → API → Applications",
	},
	overview: { Component: SentryOverview },
	widgets: [
		createWorkItemWidget({
			type: "sentry.assigned",
			title: "Assigned errors",
			description: "Unresolved Sentry issues assigned to you or your teams.",
			integrationId: SENTRY_ID,
			icon: Bug,
			query: sentryQueries.assigned,
			emptyMessage: "No unresolved errors assigned to you.",
		}),
		createWorkItemWidget({
			type: "sentry.escalating",
			title: "Escalating errors",
			description: "Issues in your projects whose volume is spiking.",
			integrationId: SENTRY_ID,
			icon: Flame,
			query: sentryQueries.escalating,
			emptyMessage: "Nothing is spiking right now.",
		}),
	],
};
