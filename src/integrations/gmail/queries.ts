import { queryOptions } from "@tanstack/react-query";
import { unwrap } from "#/core/result";
import { integrationQueryKey } from "#/lib/query-keys";
import { GMAIL_ID } from "./constants";
import {
	fetchGmailInboxStats,
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

	inboxStats: () =>
		queryOptions({
			queryKey: [...key, "inbox-stats"],
			queryFn: async () => unwrap(await fetchGmailInboxStats()),
		}),
};
