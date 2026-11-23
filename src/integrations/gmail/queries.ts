import { queryOptions } from "@tanstack/react-query";
import { unwrap } from "#/core/result";
import { integrationQueryKey } from "#/lib/query-keys";
import { GMAIL_ID } from "./constants";
import { fetchGmailUnread } from "./server-fns";

const key = integrationQueryKey(GMAIL_ID);

export const gmailQueries = {
	unread: () =>
		queryOptions({
			queryKey: [...key, "unread"],
			queryFn: async () => unwrap(await fetchGmailUnread()),
		}),
};
