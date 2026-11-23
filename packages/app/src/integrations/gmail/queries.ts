import { unwrap } from "@dashboard/core/result";
import { queryOptions } from "@tanstack/react-query";
import { integrationQueryKey } from "#/lib/query-keys";
import { GMAIL_ID } from "./constants";
import {
	fetchGmailInboxStats,
	fetchGmailMessage,
	fetchGmailStarred,
	fetchGmailUnread,
} from "./fetchers";

const key = integrationQueryKey(GMAIL_ID);

export const gmailQueries = {
	unread: () =>
		queryOptions({
			queryKey: [...key, "unread"],
			queryFn: async () => unwrap(await fetchGmailUnread()),
		}),

	starred: () =>
		queryOptions({
			queryKey: [...key, "starred"],
			queryFn: async () => unwrap(await fetchGmailStarred()),
		}),

	/** Message content doesn't change; only labels do. */
	message: (id: string) =>
		queryOptions({
			queryKey: [...key, "message", id],
			queryFn: async () => unwrap(await fetchGmailMessage(id)),
			staleTime: 10 * 60_000,
			refetchInterval: false,
		}),

	inboxStats: () =>
		queryOptions({
			queryKey: [...key, "inbox-stats"],
			queryFn: async () => unwrap(await fetchGmailInboxStats()),
		}),
};
