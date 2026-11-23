import { recentReleaseQuery, sortReleases } from "#/core/release";
import type { WorkScope } from "#/core/work-scope";
import { withIntegration } from "#/platform/integration-runner";
import {
	githubBackend,
	githubCommits,
	githubReleaseService,
	githubService,
} from "./integration";

/** Entry points for the UI. They run in-process and return a Result. */

export const fetchGitHubReviewRequests = () =>
	withIntegration(githubBackend, (ctx) =>
		githubService(ctx.accessToken).reviewRequests(),
	);

export const fetchGitHubMyPullRequests = (scope: WorkScope) =>
	withIntegration(githubBackend, (ctx) =>
		githubService(ctx.accessToken).myPullRequests(scope),
	);

export const fetchGitHubPullRequest = (ref: string) =>
	withIntegration(githubBackend, (ctx) =>
		githubService(ctx.accessToken).pullRequestDetail(ref),
	);

/** Days of commits shown on the GitHub page. */
export const RECENT_COMMIT_DAYS = 7;

export const fetchGitHubCommits = () =>
	withIntegration(githubBackend, (ctx) =>
		githubCommits(ctx, new Date(Date.now() - RECENT_COMMIT_DAYS * 86_400_000)),
	);

export const fetchGitHubReleases = () =>
	withIntegration(githubBackend, async (ctx) =>
		sortReleases(
			await githubReleaseService(ctx.accessToken).releases(
				recentReleaseQuery(),
			),
		),
	);
