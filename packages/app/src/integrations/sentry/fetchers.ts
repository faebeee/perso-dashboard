import { withIntegration } from "@dashboard/platform/integration-runner";
import { sentryBackend, sentryService } from "./integration";

/** Entry points for the UI. They run in-process and return a Result. */

export const fetchSentryAssigned = () =>
	withIntegration(sentryBackend, (ctx) => sentryService(ctx).assigned());

export const fetchSentryError = (ref: string) =>
	withIntegration(sentryBackend, (ctx) => sentryService(ctx).errorDetail(ref));

export const fetchSentryNew = () =>
	withIntegration(sentryBackend, (ctx) => sentryService(ctx).newIssues());

export const fetchSentryEscalating = () =>
	withIntegration(sentryBackend, (ctx) => sentryService(ctx).escalating());

export const fetchSentryRegressed = () =>
	withIntegration(sentryBackend, (ctx) => sentryService(ctx).regressed());
