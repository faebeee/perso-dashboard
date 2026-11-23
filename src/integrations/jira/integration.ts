import type {
	IntegrationBackend,
	IntegrationContext,
} from "#/core/integration";
import { recentReleaseQuery } from "#/core/release";
import { createJiraApi } from "./api/client";
import { issuesToAttention, overdueReleasesToAttention } from "./attention";
import { JIRA_ID } from "./constants";
import { ATLASSIAN_OAUTH_CLIENT, createJiraOAuth } from "./oauth";
import { createJiraReleaseService } from "./releases";
import { createJiraService, readJiraSite, resolveJiraSite } from "./service";

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

	getReleases: (ctx, query) => jiraReleaseService(ctx).releases(query),
};
