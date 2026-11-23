import type { WorkItem } from "#/core/work-item";
import type { GmailApi } from "./api/client";
import { GMAIL_QUERIES } from "./constants";
import { toWorkItem } from "./mapper";

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
