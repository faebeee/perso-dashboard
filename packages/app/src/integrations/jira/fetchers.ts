import { recentReleaseQuery, sortReleases } from "@dashboard/core/release";
import type { WorkScope } from "@dashboard/core/work-scope";
import { withIntegration } from "@dashboard/platform/integration-runner";
import { jiraBackend, jiraReleaseService, jiraService } from "./integration";

export const fetchJiraMyIssues = (scope: WorkScope) =>
	withIntegration(jiraBackend, (ctx) => jiraService(ctx).myIssues(scope));

export const fetchJiraOnRelease = (scope: WorkScope) =>
	withIntegration(jiraBackend, (ctx) => jiraService(ctx).onRelease(scope));

export const fetchJiraIssueDetail = (key: string) =>
	withIntegration(jiraBackend, (ctx) => jiraService(ctx).issueDetail(key));

export const fetchJiraReleases = () =>
	withIntegration(jiraBackend, async (ctx) =>
		sortReleases(await jiraReleaseService(ctx).releases(recentReleaseQuery())),
	);
