import type { IntegrationBackend } from "#/core/integration";
import { createGitHubApi } from "./api/client";
import { prSignalsToAttention, reviewRequestsToAttention } from "./attention";
import { GITHUB_ID } from "./constants";
import { createGitHubOAuth, GITHUB_OAUTH_CLIENT } from "./oauth";
import { createGitHubReleaseService } from "./releases";
import { createGitHubService } from "./service";
import { awaitingReviewToWaiting } from "./waiting";

export const githubService = (accessToken: string) =>
	createGitHubService(createGitHubApi(accessToken));

export const githubReleaseService = (accessToken: string) =>
	createGitHubReleaseService(createGitHubApi(accessToken));

export const githubBackend: IntegrationBackend = {
	id: GITHUB_ID,

	oauthClient: GITHUB_OAUTH_CLIENT,

	createOAuthProvider: createGitHubOAuth,

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

	async getAttentionItems({ accessToken }, now) {
		const service = githubService(accessToken);
		const [reviews, mine] = await Promise.all([
			service.reviewRequests(),
			service.prsNeedingAction(),
		]);
		return [
			...reviewRequestsToAttention(reviews, now),
			...prSignalsToAttention(mine),
		];
	},

	getWaitingItems: async ({ accessToken }, now) =>
		awaitingReviewToWaiting(
			await githubService(accessToken).awaitingReview(),
			now,
		),

	getReleases: ({ accessToken }, query) =>
		githubReleaseService(accessToken).releases(query),
};
