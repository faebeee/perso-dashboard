import { Rocket, SquareKanban } from "lucide-react";
import { createWorkItemWidget } from "#/components/widget-kit/create-work-item-widget";
import type { IntegrationManifest } from "#/core/integration";
import { JIRA_ID, JIRA_RELEASE_STATUSES } from "./constants";
import { jiraQueries } from "./queries";

export const jiraManifest: IntegrationManifest = {
	id: JIRA_ID,
	name: "Jira",
	description: "Open Jira Cloud issues you're assigned to or reported.",
	icon: SquareKanban,
	setup: {
		url: "https://developer.atlassian.com/console/myapps/",
		label: "Atlassian Developer Console → OAuth 2.0 (3LO)",
	},
	widgets: [
		createWorkItemWidget({
			// Type id kept from v1 so saved layouts keep working.
			type: "jira.assigned-to-me",
			title: "My issues",
			description:
				"Open Jira issues assigned to or reported by you, most recently updated first.",
			integrationId: JIRA_ID,
			icon: SquareKanban,
			scoped: true,
			query: jiraQueries.myIssues,
			emptyMessage: "No open issues for this filter.",
		}),
		createWorkItemWidget({
			type: "jira.on-release",
			title: "On Release",
			description: `All Jira issues in: ${JIRA_RELEASE_STATUSES.join(", ")}.`,
			integrationId: JIRA_ID,
			icon: Rocket,
			scoped: true,
			query: jiraQueries.onRelease,
			emptyMessage: "Nothing waiting for release right now.",
		}),
	],
};
