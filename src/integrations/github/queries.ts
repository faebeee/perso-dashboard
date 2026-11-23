import { queryOptions } from "@tanstack/react-query";
import { unwrap } from "#/core/result";
import type { WorkScope } from "#/core/work-scope";
import { integrationQueryKey } from "#/lib/query-keys";
import { GITHUB_ID } from "./constants";
import {
	fetchGitHubMyPullRequests,
	fetchGitHubReviewRequests,
} from "./server-fns";

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
			queryFn: async () =>
				unwrap(await fetchGitHubMyPullRequests({ data: { scope } })),
		}),
};
