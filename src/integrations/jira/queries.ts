import { queryOptions } from "@tanstack/react-query";
import { unwrap } from "#/core/result";
import type { WorkScope } from "#/core/work-scope";
import { integrationQueryKey } from "#/lib/query-keys";
import { JIRA_ID } from "./constants";
import {
	fetchJiraMyIssues,
	fetchJiraOnRelease,
	fetchJiraReleases,
} from "./fetchers";

const key = integrationQueryKey(JIRA_ID);

export const jiraQueries = {
	myIssues: (scope: WorkScope) =>
		queryOptions({
			queryKey: [...key, "my-issues", scope],
			queryFn: async () => unwrap(await fetchJiraMyIssues(scope)),
		}),

	onRelease: (scope: WorkScope) =>
		queryOptions({
			queryKey: [...key, "on-release", scope],
			queryFn: async () => unwrap(await fetchJiraOnRelease(scope)),
		}),

	/** Fix versions of your active projects (upcoming + recently released). */
	releases: () =>
		queryOptions({
			queryKey: [...key, "releases"],
			queryFn: async () => unwrap(await fetchJiraReleases()),
		}),
};
