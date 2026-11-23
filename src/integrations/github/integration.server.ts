import "@tanstack/react-start/server-only";
import type { IntegrationServer } from "#/core/integration";
import { readOAuthClient, requireOAuthClient } from "#/server/env";
import { createGitHubApi } from "./api/client";
import { GITHUB_ID } from "./constants";
import { createGitHubOAuth } from "./oauth";
import { createGitHubReleaseService } from "./releases";
import { createGitHubService } from "./service";

const ENV_PREFIX = "GITHUB";

export const githubService = (accessToken: string) =>
	createGitHubService(createGitHubApi(accessToken));

export const githubServer: IntegrationServer = {
	id: GITHUB_ID,

	isConfigured: () => readOAuthClient(ENV_PREFIX) !== null,

	createOAuthProvider: (redirectUri) =>
		createGitHubOAuth(requireOAuthClient(ENV_PREFIX), redirectUri),

	async describeAccount({ accessToken }) {
		const viewer = await createGitHubApi(accessToken).viewer();
		return { label: `@${viewer.login}`, meta: { login: viewer.login } };
	},

	async getFeedItems({ accessToken }) {
		const service = githubService(accessToken);
		const [reviews, mine] = await Promise.all([
			service.reviewRequests(),
			service.myPullRequests("created"),
		]);
		return [...reviews, ...mine];
	},

	getReleases: ({ accessToken }, query) =>
		createGitHubReleaseService(createGitHubApi(accessToken)).releases(query),
};
