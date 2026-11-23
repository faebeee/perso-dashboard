import { type IntegrationBackend, rulesOf } from "#/core/integration";
import { createGitHubApi } from "./api/client";
import { prSignalsToAttention, reviewRequestsToAttention } from "./attention";
import { GITHUB_ID } from "./constants";
import {
	INSIGHTS_PAGE_SIZE,
	insightQueries,
	prActivity,
	prMetrics,
} from "./insights";
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

	async getAttentionItems(ctx, now) {
		const service = githubService(ctx.accessToken);
		const [reviews, mine] = await Promise.all([
			service.reviewRequests(),
			service.prsNeedingAction(),
		]);
		return [
			...reviewRequestsToAttention(reviews, now, rulesOf(ctx).attention),
			...prSignalsToAttention(mine),
		];
	},

	async getActivity({ accessToken }, { from, to }) {
		const api = createGitHubApi(accessToken);
		const search = async (q: string) =>
			(await api.searchIssues(q, INSIGHTS_PAGE_SIZE)).items;
		const [merged, opened, reviewed] = await Promise.all([
			search(insightQueries.merged(from, to)),
			search(insightQueries.opened(from, to)),
			search(insightQueries.reviewed(from, to)),
		]);
		return prActivity({ merged, opened, reviewed }, from, to);
	},

	async getMetrics({ accessToken }, weeks, now) {
		const api = createGitHubApi(accessToken);
		const from = weeks[0]?.start ?? now;
		const search = async (q: string) =>
			(await api.searchIssues(q, INSIGHTS_PAGE_SIZE)).items;
		const [merged, reviewed] = await Promise.all([
			search(insightQueries.merged(from, now)),
			search(insightQueries.reviewed(from, now)),
		]);
		return prMetrics({ merged, reviewed }, weeks);
	},

	getWaitingItems: async ({ accessToken }, now) =>
		awaitingReviewToWaiting(
			await githubService(accessToken).awaitingReview(),
			now,
		),

	getReleases: ({ accessToken }, query) =>
		githubReleaseService(accessToken).releases(query),
};
