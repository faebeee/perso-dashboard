import { TTL, ttlByPath } from "@dashboard/platform/cache-ttl";
import { createHttpClient, type FetchFn } from "@dashboard/platform/http";
import {
	CONVERSATION_PAGE_SIZE,
	MESSAGE_LIST_FIELDS,
	MESSAGE_PAGE_SIZE,
	OUTLOOK_ID,
	odataString,
} from "../constants";
import {
	graphAttachmentListSchema,
	graphMailFolderSchema,
	graphMessageListSchema,
	graphMessageSchema,
	graphUserSchema,
} from "./schemas";

/** Inbox, Sent Items… (Graph's well-known folder names). */
export type MailFolder = "inbox" | "sentitems";

const iso = (date: Date) => date.toISOString();

/** Thin wrapper over Microsoft Graph mail endpoints (signed-in user). */
export function createOutlookApi(accessToken: string, fetch?: FetchFn) {
	const http = createHttpClient({
		integrationId: OUTLOOK_ID,
		baseUrl: "https://graph.microsoft.com",
		accessToken,
		fetch,
		ttl: ttlByPath(
			[
				[/\/v1\.0\/me$/, TTL.stable],
				// A message's content never changes: fetched once per 10 min.
				[/\/messages\/[^/]+(\/attachments)?$/, TTL.slow],
				[/\/messages$/, 60_000],
			],
			TTL.list,
		),
	});

	/**
	 * Messages of a folder (or the whole mailbox), newest first. Graph wants
	 * the `$orderby` property to lead the filter, hence the date bound.
	 */
	const list = (
		folder: MailFolder | null,
		{
			dateField = "receivedDateTime",
			from = new Date(0),
			to,
			filter,
			top = MESSAGE_PAGE_SIZE,
			count = false,
		}: {
			dateField?: "receivedDateTime" | "sentDateTime";
			from?: Date;
			to?: Date;
			filter?: string;
			top?: number;
			count?: boolean;
		} = {},
	) =>
		http.get(
			folder ? `/v1.0/me/mailFolders/${folder}/messages` : "/v1.0/me/messages",
			graphMessageListSchema,
			{
				$filter: [
					`${dateField} ge ${iso(from)}`,
					to ? `${dateField} lt ${iso(to)}` : undefined,
					filter,
				]
					.filter(Boolean)
					.join(" and "),
				$orderby: `${dateField} desc`,
				$select: MESSAGE_LIST_FIELDS,
				$top: top,
				$count: count ? "true" : undefined,
			},
		);

	return {
		me: () =>
			http.get("/v1.0/me", graphUserSchema, {
				$select: "displayName,mail,userPrincipalName",
			}),

		list,

		/** Exact item counts of a folder. */
		folder: (folder: MailFolder) =>
			http.get(`/v1.0/me/mailFolders/${folder}`, graphMailFolderSchema, {
				$select: "totalItemCount,unreadItemCount",
			}),

		/** Flagged messages anywhere in the mailbox, newest first (with a count). */
		flagged: () =>
			http.get("/v1.0/me/messages", graphMessageListSchema, {
				$filter: "flag/flagStatus eq 'flagged'",
				$select: MESSAGE_LIST_FIELDS,
				$top: MESSAGE_PAGE_SIZE,
				$count: "true",
			}),

		/** Messages of one conversation, any folder (order not guaranteed). */
		conversation: (conversationId: string) =>
			http.get("/v1.0/me/messages", graphMessageListSchema, {
				$filter: `conversationId eq ${odataString(conversationId)}`,
				$select: "id,from,receivedDateTime,sentDateTime",
				$top: CONVERSATION_PAGE_SIZE,
			}),

		/** Full-text search (KQL), e.g. `"participants:a@x.com"`. */
		search: (query: string, top = MESSAGE_PAGE_SIZE) =>
			http.get("/v1.0/me/messages", graphMessageListSchema, {
				$search: query,
				$select: MESSAGE_LIST_FIELDS,
				$top: top,
			}),

		/** One message with its body, always as HTML. */
		message: (id: string) =>
			http.get(
				`/v1.0/me/messages/${encodeURIComponent(id)}`,
				graphMessageSchema,
				{ $select: `${MESSAGE_LIST_FIELDS},ccRecipients,body` },
				{ headers: { Prefer: 'outlook.body-content-type="html"' } },
			),

		attachments: (id: string) =>
			http.get(
				`/v1.0/me/messages/${encodeURIComponent(id)}/attachments`,
				graphAttachmentListSchema,
				{ $select: "name,contentType,size,isInline" },
			),
	};
}

export type OutlookApi = ReturnType<typeof createOutlookApi>;
