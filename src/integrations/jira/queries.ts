import { queryOptions } from "@tanstack/react-query";
import { unwrap } from "#/core/result";
import type { WorkScope } from "#/core/work-scope";
import { integrationQueryKey } from "#/lib/query-keys";
import { JIRA_ID } from "./constants";
import { fetchJiraMyIssues, fetchJiraOnRelease } from "./server-fns";

const key = integrationQueryKey(JIRA_ID);

export const jiraQueries = {
	myIssues: (scope: WorkScope) =>
		queryOptions({
			queryKey: [...key, "my-issues", scope],
			queryFn: async () => unwrap(await fetchJiraMyIssues({ data: { scope } })),
		}),

	onRelease: (scope: WorkScope) =>
		queryOptions({
			queryKey: [...key, "on-release", scope],
			queryFn: async () =>
				unwrap(await fetchJiraOnRelease({ data: { scope } })),
		}),
};
