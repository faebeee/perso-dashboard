import { unwrap } from "@dashboard/core/result";
import type { WorkScope } from "@dashboard/core/work-scope";
import { queryOptions } from "@tanstack/react-query";
import { integrationQueryKey } from "#/lib/query-keys";
import { GITHUB_ID } from "./constants";
import {
	fetchDependabotAlerts,
	fetchGitHubCommits,
	fetchGitHubMyPullRequests,
	fetchGitHubPullRequest,
	fetchGitHubReleases,
	fetchGitHubReviewRequests,
} from "./fetchers";

const key = integrationQueryKey(GITHUB_ID);

export const githubQueries = {
	reviewRequests: () =>
		queryOptions({
			queryKey: [...key, "review-requests"],
			queryFn: async () => unwrap(await fetchGitHubReviewRequests()),
		}),

	myPullRequests: (scope: WorkScope) =>
		queryOptions({
			queryKey: [...key, "my-pull-requests", scope],
			queryFn: async () => unwrap(await fetchGitHubMyPullRequests(scope)),
		}),

	/** Open Dependabot alerts across repositories you can write to. */
	dependabotAlerts: () =>
		queryOptions({
			queryKey: [...key, "dependabot"],
			queryFn: async () => unwrap(await fetchDependabotAlerts()),
			// Security alerts change slowly; the HTTP cache holds them 10 min too.
			staleTime: 10 * 60_000,
		}),

	/** Your commits of the last days, on any repo and branch. */
	recentCommits: () =>
		queryOptions({
			queryKey: [...key, "commits"],
			queryFn: async () => unwrap(await fetchGitHubCommits()),
		}),

	pullRequest: (ref: string) =>
		queryOptions({
			queryKey: [...key, "pull", ref],
			queryFn: async () => unwrap(await fetchGitHubPullRequest(ref)),
		}),

	/** Releases in your active repos (upcoming + recently shipped). */
	releases: () =>
		queryOptions({
			queryKey: [...key, "releases"],
			queryFn: async () => unwrap(await fetchGitHubReleases()),
		}),
};
