import { createServerFn } from "@tanstack/react-start";
import { scopedInputSchema } from "#/core/work-scope";
import { withIntegration } from "#/server/integration-runner";
import { githubServer, githubService } from "./integration.server";

/** RPC entry points for the UI. Bodies run on the server only. */

export const fetchGitHubReviewRequests = createServerFn({
	method: "GET",
}).handler(() =>
	withIntegration(githubServer, (ctx) =>
		githubService(ctx.accessToken).reviewRequests(),
	),
);

export const fetchGitHubMyPullRequests = createServerFn({ method: "GET" })
	.validator(scopedInputSchema)
	.handler(({ data }) =>
		withIntegration(githubServer, (ctx) =>
			githubService(ctx.accessToken).myPullRequests(data.scope),
		),
	);
