import { queryOptions } from "@tanstack/react-query";
import { unwrap } from "#/core/result";
import type { WorkScope } from "#/core/work-scope";
import { integrationQueryKey } from "#/lib/query-keys";
import { GITHUB_ID } from "./constants";
import {
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
