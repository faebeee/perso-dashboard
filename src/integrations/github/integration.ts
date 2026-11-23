import {
	type IntegrationBackend,
	type IntegrationContext,
	rulesOf,
} from "#/core/integration";
import { createGitHubApi } from "./api/client";
import { prSignalsToAttention, reviewRequestsToAttention } from "./attention";
import { type CommitInfo, createGitHubCommitService } from "./commits";
import { GITHUB_ID } from "./constants";
import {
	commitActivity,
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

/** Your login: stored at connect time, looked up for older connections. */
async function githubLogin(ctx: IntegrationContext): Promise<string> {
	if (typeof ctx.meta.login === "string") return ctx.meta.login;
	return (await createGitHubApi(ctx.accessToken).viewer()).login;
}

/** Commits you pushed in [since, until), on any repo and branch. */
export async function githubCommits(
	ctx: IntegrationContext,
	since: Date,
	until?: Date,
): Promise<CommitInfo[]> {
	return createGitHubCommitService(createGitHubApi(ctx.accessToken)).recent(
		await githubLogin(ctx),
		since,
		until,
	);
}

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

	async getActivity(ctx, { from, to }) {
		const api = createGitHubApi(ctx.accessToken);
		const search = async (q: string) =>
			(await api.searchIssues(q, INSIGHTS_PAGE_SIZE)).items;
		const [merged, opened, reviewed, commits] = await Promise.all([
			search(insightQueries.merged(from, to)),
			search(insightQueries.opened(from, to)),
			search(insightQueries.reviewed(from, to)),
			// Commits are a bonus: if events are unavailable, PRs still count.
			githubCommits(ctx, from, to).catch(() => []),
		]);
		return [
			...prActivity({ merged, opened, reviewed }, from, to),
			...commitActivity(commits),
		];
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
