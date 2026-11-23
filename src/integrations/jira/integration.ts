import type {
	IntegrationBackend,
	IntegrationContext,
} from "#/core/integration";
import { recentReleaseQuery } from "#/core/release";
import { createJiraApi } from "./api/client";
import { issuesToAttention, overdueReleasesToAttention } from "./attention";
import { JIRA_ID } from "./constants";
import {
	INSIGHTS_PAGE_SIZE,
	insightJql,
	issueActivity,
	issueMetrics,
} from "./insights";
import { ATLASSIAN_OAUTH_CLIENT, createJiraOAuth } from "./oauth";
import { createJiraReleaseService } from "./releases";
import { createJiraService, readJiraSite, resolveJiraSite } from "./service";
import { unassignedToWaiting } from "./waiting";

export const jiraService = (ctx: IntegrationContext) =>
	createJiraService(createJiraApi(ctx.accessToken), readJiraSite(ctx.meta));

export const jiraReleaseService = (ctx: IntegrationContext) =>
	createJiraReleaseService(
		createJiraApi(ctx.accessToken),
		readJiraSite(ctx.meta),
	);

export const jiraBackend: IntegrationBackend = {
	id: JIRA_ID,

	oauthClient: ATLASSIAN_OAUTH_CLIENT,

	createOAuthProvider: createJiraOAuth,

	async describeAccount({ accessToken }) {
		const site = await resolveJiraSite(createJiraApi(accessToken));
		return { label: site.siteName, meta: site };
	},

	getFeedItems: (ctx) => jiraService(ctx).myIssues("assigned"),

	async getAttentionItems(ctx, now) {
		const site = readJiraSite(ctx.meta);
		// Issues are essential; overdue versions are a bonus that may fail alone.
		const [issues, releases] = await Promise.all([
			jiraService(ctx).urgentCandidates(),
			jiraReleaseService(ctx)
				.releases(recentReleaseQuery(now.getTime()))
				.catch(() => []),
		]);
		return [
			...issuesToAttention(issues, site.siteUrl, now),
			...overdueReleasesToAttention(releases, now),
		];
	},

	async getActivity(ctx, { from, to }) {
		const site = readJiraSite(ctx.meta);
		const api = createJiraApi(ctx.accessToken);
		const search = async (jql: string) =>
			(await api.searchIssues(site.cloudId, jql, INSIGHTS_PAGE_SIZE)).issues;
		const [resolved, workedOn] = await Promise.all([
			search(insightJql.resolved(from, to)),
			// updatedBy() can be unavailable on some sites: resolved still counts.
			search(insightJql.workedOn(from, to)).catch(() => []),
		]);
		return issueActivity({ resolved, workedOn }, site.siteUrl, from, to);
	},

	async getMetrics(ctx, weeks, now) {
		const site = readJiraSite(ctx.meta);
		const resolved = await createJiraApi(ctx.accessToken).searchIssues(
			site.cloudId,
			insightJql.resolved(weeks[0]?.start ?? now, now),
			INSIGHTS_PAGE_SIZE,
		);
		return issueMetrics(resolved.issues, weeks);
	},

	async getWaitingItems(ctx, now) {
		const site = readJiraSite(ctx.meta);
		return unassignedToWaiting(
			await jiraService(ctx).unassignedReported(),
			site.siteUrl,
			now,
		);
	},

	getReleases: (ctx, query) => jiraReleaseService(ctx).releases(query),
};
