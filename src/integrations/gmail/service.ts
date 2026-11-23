import "@tanstack/react-start/server-only";
import type { WorkItem } from "#/core/work-item";
import type { GmailApi } from "./api/client";
import { GMAIL_QUERIES } from "./constants";
import { toWorkItem } from "./mapper";

export function createGmailService(api: GmailApi, accountEmail?: string) {
	return {
		async unreadInbox(): Promise<WorkItem[]> {
			const list = await api.listMessages(GMAIL_QUERIES.unreadInbox);
			// The list endpoint only returns ids, so fetch headers in parallel.
			const messages = await Promise.all(
				list.messages.map((m) => api.getMessageMetadata(m.id)),
			);
			return messages.map((m) => toWorkItem(m, accountEmail));
		},
	};
}
