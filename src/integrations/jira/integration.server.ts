import "@tanstack/react-start/server-only";
import type { IntegrationContext, IntegrationServer } from "#/core/integration";
import { readOAuthClient, requireOAuthClient } from "#/server/env";
import { createJiraApi } from "./api/client";
import { JIRA_ID } from "./constants";
import { createJiraOAuth } from "./oauth";
import { createJiraReleaseService } from "./releases";
import { createJiraService, readJiraSite, resolveJiraSite } from "./service";

const ENV_PREFIX = "ATLASSIAN";

export const jiraService = (ctx: IntegrationContext) =>
	createJiraService(createJiraApi(ctx.accessToken), readJiraSite(ctx.meta));

export const jiraServer: IntegrationServer = {
	id: JIRA_ID,

	isConfigured: () => readOAuthClient(ENV_PREFIX) !== null,

	createOAuthProvider: (redirectUri) =>
		createJiraOAuth(requireOAuthClient(ENV_PREFIX), redirectUri),

	async describeAccount({ accessToken }) {
		const site = await resolveJiraSite(createJiraApi(accessToken));
		return { label: site.siteName, meta: site };
	},

	getFeedItems: (ctx) => jiraService(ctx).myIssues("assigned"),

	getReleases: (ctx, query) =>
		createJiraReleaseService(
			createJiraApi(ctx.accessToken),
			readJiraSite(ctx.meta),
		).releases(query),
};
