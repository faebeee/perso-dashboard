import type { IntegrationManifest } from "@dashboard/core/integration";
import { GitPullRequest, GitPullRequestDraft, ShieldAlert } from "lucide-react";
import { createWorkItemWidget } from "#/components/widget-kit/create-work-item-widget";
import { GITHUB_ID } from "./constants";
import { DependabotWidget } from "./dependabot-view";
import { GitHubOverview } from "./overview";
import { PullRequestDetailView } from "./pull-request-detail-view";
import { githubQueries } from "./queries";
import { githubSetupGuide } from "./setup-guide";

export const githubManifest: IntegrationManifest = {
	id: GITHUB_ID,
	name: "GitHub",
	description: "Pull requests waiting for your review and the ones you opened.",
	icon: GitPullRequest,
	accent: "#8250df",
	setup: {
		url: "https://github.com/settings/developers",
		label: "GitHub → Developer settings → OAuth Apps",
	},
	setupGuide: githubSetupGuide,
	details: { Component: PullRequestDetailView },
	overview: { Component: GitHubOverview, scoped: true },
	widgets: [
		createWorkItemWidget({
			type: "github.review-requests",
			title: "Review requests",
			description: "Open PRs where your review is requested.",
			integrationId: GITHUB_ID,
			icon: GitPullRequest,
			query: githubQueries.reviewRequests,
			emptyMessage: "No reviews waiting on you.",
		}),
		createWorkItemWidget({
			type: "github.my-pull-requests",
			title: "My pull requests",
			description: "Open PRs you opened or are assigned to.",
			integrationId: GITHUB_ID,
			icon: GitPullRequestDraft,
			scoped: true,
			query: githubQueries.myPullRequests,
			emptyMessage: "No open pull requests for this filter.",
		}),
		{
			type: "github.dependabot",
			title: "Dependabot alerts",
			description:
				"Open security alerts across the repositories you can write to.",
			integrationId: GITHUB_ID,
			icon: ShieldAlert,
			defaultSize: { w: 4, h: 10 },
			minSize: { w: 3, h: 5 },
			Component: DependabotWidget,
		},
	],
};
