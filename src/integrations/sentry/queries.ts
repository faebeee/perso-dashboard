import { queryOptions } from "@tanstack/react-query";
import { unwrap } from "#/core/result";
import { integrationQueryKey } from "#/lib/query-keys";
import { SENTRY_ID } from "./constants";
import {
	fetchSentryAssigned,
	fetchSentryEscalating,
	fetchSentryNew,
	fetchSentryRegressed,
} from "./fetchers";

const key = integrationQueryKey(SENTRY_ID);

export const sentryQueries = {
	assigned: () =>
		queryOptions({
			queryKey: [...key, "assigned"],
			queryFn: async () => unwrap(await fetchSentryAssigned()),
		}),
	newIssues: () =>
		queryOptions({
			queryKey: [...key, "new"],
			queryFn: async () => unwrap(await fetchSentryNew()),
		}),
	escalating: () =>
		queryOptions({
			queryKey: [...key, "escalating"],
			queryFn: async () => unwrap(await fetchSentryEscalating()),
		}),
	regressed: () =>
		queryOptions({
			queryKey: [...key, "regressed"],
			queryFn: async () => unwrap(await fetchSentryRegressed()),
		}),
};
