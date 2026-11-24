import {
	DEFAULT_WAITING_RULES,
	type WaitingRules,
} from "@dashboard/core/waiting";
import type { WorkItem } from "@dashboard/core/work-item";
import { settleLeniently } from "#/lib/collect-sources";
import type { OutlookApi } from "./api/client";
import type { GraphMessageList } from "./api/schemas";
import { withPeopleSearch } from "./constants";
import { toWorkItem } from "./mapper";
import { toEmailDetail } from "./message";
import { latestPerConversation, type SentConversation } from "./waiting";

const DAY_MS = 24 * 60 * 60 * 1000;

const items = (list: GraphMessageList): WorkItem[] =>
	list.value.map(toWorkItem);

export interface OutlookInboxStats {
	unread: number;
	inbox: number;
	flagged: number;
}

export function createOutlookService(
	api: OutlookApi,
	now: () => Date = () => new Date(),
) {
	return {
		unreadInbox: async () =>
			items(await api.list("inbox", { filter: "isRead eq false" })),

		flagged: async () => items(await api.flagged()),

		/** Unread mail marked high importance from the last `days` days. */
		importantUnread: async (days: number) =>
			items(
				await api.list("inbox", {
					from: new Date(now().getTime() - days * DAY_MS),
					filter: "isRead eq false and importance eq 'high'",
				}),
			),

		/** Messages you sent in [from, to) (latest page). */
		sentBetween: async (from: Date, to: Date) =>
			items(
				await api.list("sentitems", { dateField: "sentDateTime", from, to }),
			),

		/** Exact count of a folder's messages in [from, to). */
		async countBetween(
			folder: "inbox" | "sentitems",
			from: Date,
			to: Date,
		): Promise<number> {
			const list = await api.list(folder, {
				dateField: folder === "inbox" ? "receivedDateTime" : "sentDateTime",
				from,
				to,
				top: 1,
				count: true,
			});
			return list["@odata.count"] ?? list.value.length;
		},

		/** Recent mail with any of these people (meeting prep). */
		async withPeople(people: readonly string[], since: Date) {
			// No usable address: no search (an empty one would match all mail).
			const query = withPeopleSearch(people);
			if (!query) return [];
			// $search can't be combined with a date filter: filter here.
			return items(await api.search(query)).filter(
				(m) => Date.parse(m.updatedAt) >= since.getTime(),
			);
		},

		/**
		 * What you sent between `noReplyWindowDays` and `noReplyAfterDays` ago,
		 * one message per conversation, with the conversation around it.
		 */
		async recentlySent(
			rules: WaitingRules = DEFAULT_WAITING_RULES,
		): Promise<SentConversation[]> {
			const t = now().getTime();
			const sent = await api.list("sentitems", {
				dateField: "sentDateTime",
				from: new Date(t - rules.noReplyWindowDays * DAY_MS),
				to: new Date(t - rules.noReplyAfterDays * DAY_MS),
			});
			// A conversation that can't be read is skipped, not fatal.
			return settleLeniently(
				latestPerConversation(sent.value).map(async (message) => ({
					sent: message,
					conversation: message.conversationId
						? await api.conversation(message.conversationId)
						: { value: [] },
				})),
			);
		},

		async message(id: string) {
			const [message, attachments] = await Promise.all([
				api.message(id),
				api.attachments(id),
			]);
			return toEmailDetail(message, attachments);
		},

		async inboxStats(): Promise<OutlookInboxStats> {
			const [inbox, flagged] = await Promise.all([
				api.folder("inbox"),
				api.flagged(),
			]);
			return {
				unread: inbox.unreadItemCount,
				inbox: inbox.totalItemCount,
				flagged: flagged["@odata.count"] ?? flagged.value.length,
			};
		},
	};
}
