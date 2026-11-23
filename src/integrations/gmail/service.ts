import type { WorkItem } from "#/core/work-item";
import type { GmailApi } from "./api/client";
import { GMAIL_QUERIES, withPeopleQuery } from "./constants";
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

		importantUnread: () => search(GMAIL_QUERIES.importantUnread),

		/** Recent conversations you wrote in, with all their messages' headers. */
		async recentlySentThreads() {
			const list = await api.listThreads(GMAIL_QUERIES.recentlySent);
			return Promise.all(list.threads.map((t) => api.getThreadMetadata(t.id)));
		},

		/** Recent mail with any of these people (meeting prep). */
		withPeople: (people: readonly string[], since: Date) =>
			people.length === 0
				? Promise.resolve([])
				: search(withPeopleQuery(people, since)),

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
