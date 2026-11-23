import { createHttpClient, type FetchFn } from "#/platform/http";
import { GMAIL_ID, MESSAGE_PAGE_SIZE } from "../constants";
import {
	gmailFullMessageSchema,
	gmailLabelSchema,
	gmailMessageListSchema,
	gmailMessageSchema,
	gmailProfileSchema,
	gmailThreadListSchema,
	gmailThreadSchema,
} from "./schemas";

/** Thin wrapper over the Gmail REST API (users/me). */
export function createGmailApi(accessToken: string, fetch?: FetchFn) {
	const http = createHttpClient({
		integrationId: GMAIL_ID,
		baseUrl: "https://gmail.googleapis.com",
		accessToken,
		fetch,
	});
	const base = "/gmail/v1/users/me";

	return {
		profile: () => http.get(`${base}/profile`, gmailProfileSchema),

		/** Exact totals for a label, e.g. "INBOX". */
		label: (id: string) =>
			http.get(`${base}/labels/${encodeURIComponent(id)}`, gmailLabelSchema),

		listMessages: (q: string, maxResults = MESSAGE_PAGE_SIZE) =>
			http.get(`${base}/messages`, gmailMessageListSchema, { q, maxResults }),

		/** Headers + full MIME tree with inline bodies (attachments by id only). */
		getMessage: (id: string) =>
			http.get(
				`${base}/messages/${encodeURIComponent(id)}`,
				gmailFullMessageSchema,
				{ format: "full" },
			),

		listThreads: (q: string, maxResults = MESSAGE_PAGE_SIZE) =>
			http.get(`${base}/threads`, gmailThreadListSchema, { q, maxResults }),

		/** All messages of a thread, headers only. */
		getThreadMetadata: (id: string) =>
			http.get(`${base}/threads/${encodeURIComponent(id)}`, gmailThreadSchema, {
				format: "metadata",
				metadataHeaders: ["From", "To", "Subject"],
			}),

		getMessageMetadata: (id: string) =>
			http.get(
				`${base}/messages/${encodeURIComponent(id)}`,
				gmailMessageSchema,
				{ format: "metadata", metadataHeaders: ["From", "Subject"] },
			),
	};
}

export type GmailApi = ReturnType<typeof createGmailApi>;
