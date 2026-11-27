import {
	type ChoiceListSetting,
	type IntegrationBackend,
	type IntegrationContext,
	rulesOf,
	stringListSetting,
} from "@dashboard/core/integration";
import { createGitHubApi } from "./api/client";
import {
	criticalAlertsToAttention,
	prSignalsToAttention,
	reviewRequestsToAttention,
} from "./attention";
import { type CommitInfo, createGitHubCommitService } from "./commits";
import { GITHUB_ID } from "./constants";
import { createDependabotService } from "./dependabot";
import {
	commitActivity,
	INSIGHTS_PAGE_SIZE,
	insightQueries,
	prActivity,
	prMetrics,
} from "./insights";
import { createGitHubOAuth, GITHUB_OAUTH_CLIENT } from "./oauth";
import { createGitHubReleaseService } from "./releases";
import { loadRepoOptions, withRepoFilter } from "./repo-filter";
import { createGitHubService } from "./service";
import { awaitingReviewToWaiting } from "./waiting";

/** Which repositories feed the app (Preferences → GitHub). */
export const REPOSITORIES_SETTING: ChoiceListSetting = {
	key: "repositories",
	label: "Repositories",
	description:
		"Only PRs, commits, releases and alerts from these repositories appear in the app. Select none to follow all of them.",
	type: "choice-list",
	default: [],
	allWhenEmpty: true,
};

/** The API, narrowed to the repositories you follow. */
export const githubApi = (ctx: IntegrationContext) =>
	withRepoFilter(
		createGitHubApi(ctx.accessToken),
		stringListSetting(ctx.settings, REPOSITORIES_SETTING),
	);

export const githubService = (ctx: IntegrationContext) =>
	createGitHubService(githubApi(ctx));

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
	return createGitHubCommitService(githubApi(ctx)).recent(
		await githubLogin(ctx),
		since,
		until,
	);
}

export const githubReleaseService = (ctx: IntegrationContext) =>
	createGitHubReleaseService(githubApi(ctx));

export const githubBackend: IntegrationBackend = {
	id: GITHUB_ID,

	oauthClient: GITHUB_OAUTH_CLIENT,

	settings: [REPOSITORIES_SETTING],

	/** All your repositories: the picker itself is never filtered. */
	loadSettingOptions: async (ctx, key) =>
		key === REPOSITORIES_SETTING.key
			? loadRepoOptions(createGitHubApi(ctx.accessToken))
			: [],

	createOAuthProvider: createGitHubOAuth,

	async describeAccount({ accessToken }) {
		const viewer = await createGitHubApi(accessToken).viewer();
		return { label: `@${viewer.login}`, meta: { login: viewer.login } };
	},

	getRelatedItems: (ctx, { keys, since }) =>
		githubService(ctx).related(keys, since),

	async getFeedItems(ctx) {
		const service = githubService(ctx);
		const [reviews, mine] = await Promise.all([
			service.reviewRequests(),
			service.myPullRequests("created"),
		]);
		return [...reviews, ...mine];
	},

	async getAttentionItems(ctx, now) {
		const service = githubService(ctx);
		const [reviews, mine, alerts] = await Promise.all([
			service.reviewRequests(),
			service.prsNeedingAction(),
			// A bonus: missing scope or API trouble must not hide your PRs.
			createDependabotService(githubApi(ctx))
				.openAlerts(ctx.scopes)
				.then((r) => r.items)
				.catch(() => []),
		]);
		return [
			...reviewRequestsToAttention(reviews, now, rulesOf(ctx).attention),
			...prSignalsToAttention(mine),
			...criticalAlertsToAttention(alerts),
		];
	},

	async getActivity(ctx, { from, to }) {
		const api = githubApi(ctx);
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

	async getMetrics(ctx, weeks, now) {
		const api = githubApi(ctx);
		const from = weeks[0]?.start ?? now;
		const search = async (q: string) =>
			(await api.searchIssues(q, INSIGHTS_PAGE_SIZE)).items;
		const [merged, reviewed] = await Promise.all([
			search(insightQueries.merged(from, now)),
			search(insightQueries.reviewed(from, now)),
		]);
		return prMetrics({ merged, reviewed }, weeks);
	},

	getWaitingItems: async (ctx, now) =>
		awaitingReviewToWaiting(await githubService(ctx).awaitingReview(), now),

	getReleases: (ctx, query) => githubReleaseService(ctx).releases(query),
};
