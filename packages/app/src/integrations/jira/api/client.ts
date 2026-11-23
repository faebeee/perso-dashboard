import { TTL, ttlByPath } from "@dashboard/platform/cache-ttl";
import { createHttpClient, type FetchFn } from "@dashboard/platform/http";
import { JIRA_ID, SEARCH_PAGE_SIZE } from "../constants";
import {
	jiraAccessibleResourcesSchema,
	jiraIssueDetailSchema,
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
	"duedate",
	"created",
	"resolutiondate",
];

/** Thin wrapper over the Atlassian platform + Jira Cloud REST v3 APIs. */
const DETAIL_FIELDS = [
	...SEARCH_FIELDS,
	"created",
	"labels",
	"parent",
	"description",
	"comment",
];

export function createJiraApi(accessToken: string, fetch?: FetchFn) {
	const http = createHttpClient({
		integrationId: JIRA_ID,
		baseUrl: "https://api.atlassian.com",
		accessToken,
		fetch,
		ttl: ttlByPath(
			[
				[/accessible-resources$/, TTL.stable],
				[/\/version$/, TTL.slow],
				// An issue you just opened should show recent edits.
				[/\/issue\/[^/]+$/, 60_000],
			],
			TTL.list,
		),
	});

	return {
		accessibleResources: () =>
			http.get(
				"/oauth/token/accessible-resources",
				jiraAccessibleResourcesSchema,
			),

		searchIssues: (
			cloudId: string,
			jql: string,
			maxResults = SEARCH_PAGE_SIZE,
		) =>
			http.get(
				`/ex/jira/${encodeURIComponent(cloudId)}/rest/api/3/search/jql`,
				jiraSearchResponseSchema,
				{ jql, maxResults, fields: SEARCH_FIELDS.join(",") },
			),

		/** One issue with rendered (HTML) description and comments. */
		issue: (cloudId: string, key: string) =>
			http.get(
				`/ex/jira/${encodeURIComponent(cloudId)}/rest/api/3/issue/${encodeURIComponent(key)}`,
				jiraIssueDetailSchema,
				{ fields: DETAIL_FIELDS.join(","), expand: "renderedFields" },
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
