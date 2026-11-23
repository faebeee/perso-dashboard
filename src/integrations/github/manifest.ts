import { GitPullRequest, GitPullRequestDraft } from "lucide-react";
import { createWorkItemWidget } from "#/components/widget-kit/create-work-item-widget";
import type { IntegrationManifest } from "#/core/integration";
import { GITHUB_ID } from "./constants";
import { githubQueries } from "./queries";

export const githubManifest: IntegrationManifest = {
	id: GITHUB_ID,
	name: "GitHub",
	description: "Pull requests waiting for your review and the ones you opened.",
	icon: GitPullRequest,
	setup: {
		url: "https://github.com/settings/developers",
		label: "GitHub → Developer settings → OAuth Apps",
	},
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
	],
};
