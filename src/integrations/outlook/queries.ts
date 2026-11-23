import { queryOptions } from "@tanstack/react-query";
import { unwrap } from "#/core/result";
import { integrationQueryKey } from "#/lib/query-keys";
import { OUTLOOK_ID } from "./constants";
import {
	fetchOutlookFlagged,
	fetchOutlookInboxStats,
	fetchOutlookMessage,
	fetchOutlookUnread,
} from "./fetchers";

const key = integrationQueryKey(OUTLOOK_ID);

export const outlookQueries = {
	unread: () =>
		queryOptions({
			queryKey: [...key, "unread"],
			queryFn: async () => unwrap(await fetchOutlookUnread()),
		}),

	flagged: () =>
		queryOptions({
			queryKey: [...key, "flagged"],
			queryFn: async () => unwrap(await fetchOutlookFlagged()),
		}),

	/** Message content doesn't change. */
	message: (id: string) =>
		queryOptions({
			queryKey: [...key, "message", id],
			queryFn: async () => unwrap(await fetchOutlookMessage(id)),
			staleTime: 10 * 60_000,
			refetchInterval: false,
		}),

	inboxStats: () =>
		queryOptions({
			queryKey: [...key, "inbox-stats"],
			queryFn: async () => unwrap(await fetchOutlookInboxStats()),
		}),
};
