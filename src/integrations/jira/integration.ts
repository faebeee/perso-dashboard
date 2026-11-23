import type {
	IntegrationBackend,
	IntegrationContext,
} from "#/core/integration";
import { createJiraApi } from "./api/client";
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

	getReleases: (ctx, query) => jiraReleaseService(ctx).releases(query),
};
