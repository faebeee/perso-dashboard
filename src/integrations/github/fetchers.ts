import { recentReleaseQuery, sortReleases } from "#/core/release";
import type { WorkScope } from "#/core/work-scope";
import { withIntegration } from "#/platform/integration-runner";
import {
	githubBackend,
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

export const fetchGitHubReleases = () =>
	withIntegration(githubBackend, async (ctx) =>
		sortReleases(
			await githubReleaseService(ctx.accessToken).releases(
				recentReleaseQuery(),
			),
		),
	);
