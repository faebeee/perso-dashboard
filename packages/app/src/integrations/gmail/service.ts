import type { WaitingRules } from "@dashboard/core/waiting";
import type { WorkItem } from "@dashboard/core/work-item";
import type { GmailApi } from "./api/client";
import { GMAIL_QUERIES, withPeopleQuery } from "./constants";
import { insightQueries } from "./insights";
import { toWorkItem } from "./mapper";
import { toEmailDetail } from "./message";

export interface GmailInboxStats {
	/** Conversations, as Gmail counts them in its UI. */
	unreadThreads: number;
	inboxThreads: number;
	starredThreads: number;
}

export function createGmailService(api: GmailApi, accountEmail?: string) {
	async function search(q: string): Promise<WorkItem[]> {
		const list = await api.listMessages(q);
		// The list endpoint only returns ids, so fetch headers in parallel.
		const messages = await Promise.all(
			list.messages.map((m) => api.getMessageMetadata(m.id)),
		);
		return messages.map((m) => toWorkItem(m, accountEmail));
	}

	return {
		unreadInbox: () => search(GMAIL_QUERIES.unreadInbox),

		starred: () => search(GMAIL_QUERIES.starred),

		importantUnread: (emailWindowDays?: number) =>
			search(GMAIL_QUERIES.importantUnread(emailWindowDays)),

		/** Recent conversations you wrote in, with all their messages' headers. */
		async recentlySentThreads(rules?: WaitingRules) {
			const list = await api.listThreads(GMAIL_QUERIES.recentlySent(rules));
			return Promise.all(list.threads.map((t) => api.getThreadMetadata(t.id)));
		},

		/** Recent mail with any of these people (meeting prep). */
		withPeople: (people: readonly string[], since: Date) => {
			// No usable address: no search (an empty one would match all mail).
			const q = withPeopleQuery(people, since);
			return q ? search(q) : Promise.resolve([]);
		},

		/** Messages you sent in [from, to) (latest page). */
		sentBetween: (from: Date, to: Date) =>
			search(insightQueries.sent(from, to)),

		/** Gmail's result estimate for a query (one cheap request). */
		async estimate(q: string): Promise<number> {
			return (await api.listMessages(q, 1)).resultSizeEstimate ?? 0;
		},

		/** One message for the detail view. */
		message: async (id: string) =>
			toEmailDetail(await api.getMessage(id), accountEmail),

		async inboxStats(): Promise<GmailInboxStats> {
			const [inbox, starred] = await Promise.all([
				api.label("INBOX"),
				api.label("STARRED"),
			]);
			return {
				unreadThreads: inbox.threadsUnread,
				inboxThreads: inbox.threadsTotal,
				starredThreads: starred.threadsTotal,
			};
		},
	};
}
