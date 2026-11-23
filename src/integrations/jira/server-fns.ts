import { createServerFn } from "@tanstack/react-start";
import { scopedInputSchema } from "#/core/work-scope";
import { withIntegration } from "#/server/integration-runner";
import { jiraServer, jiraService } from "./integration.server";

export const fetchJiraMyIssues = createServerFn({ method: "GET" })
	.validator(scopedInputSchema)
	.handler(({ data }) =>
		withIntegration(jiraServer, (ctx) => jiraService(ctx).myIssues(data.scope)),
	);

export const fetchJiraOnRelease = createServerFn({ method: "GET" })
	.validator(scopedInputSchema)
	.handler(({ data }) =>
		withIntegration(jiraServer, (ctx) =>
			jiraService(ctx).onRelease(data.scope),
		),
	);
