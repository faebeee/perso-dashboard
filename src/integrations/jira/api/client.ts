import "@tanstack/react-start/server-only";
import { createHttpClient, type FetchFn } from "#/server/http";
import { JIRA_ID } from "../constants";
import {
	jiraAccessibleResourcesSchema,
	jiraSearchResponseSchema,
	jiraVersionPageSchema,
} from "./schemas";

const SEARCH_FIELDS = [
	"summary",
	"updated",
	"status",
	"priority",
	"issuetype",
	"project",
	"reporter",
	"assignee",
];

/** Thin wrapper over the Atlassian platform + Jira Cloud REST v3 APIs. */
export function createJiraApi(accessToken: string, fetch?: FetchFn) {
	const http = createHttpClient({
		integrationId: JIRA_ID,
		baseUrl: "https://api.atlassian.com",
		accessToken,
		fetch,
	});

	return {
		accessibleResources: () =>
			http.get(
				"/oauth/token/accessible-resources",
				jiraAccessibleResourcesSchema,
			),

		searchIssues: (cloudId: string, jql: string, maxResults = 30) =>
			http.get(
				`/ex/jira/${encodeURIComponent(cloudId)}/rest/api/3/search/jql`,
				jiraSearchResponseSchema,
				{ jql, maxResults, fields: SEARCH_FIELDS.join(",") },
			),

		/** Released + unreleased versions of a project, newest release date first. */
		projectVersions: (cloudId: string, projectKey: string, maxResults = 50) =>
			http.get(
				`/ex/jira/${encodeURIComponent(cloudId)}/rest/api/3/project/${encodeURIComponent(projectKey)}/version`,
				jiraVersionPageSchema,
				{ status: "released,unreleased", orderBy: "-releaseDate", maxResults },
			),
	};
}

export type JiraApi = ReturnType<typeof createJiraApi>;
