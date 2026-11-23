import "@tanstack/react-start/server-only";
import { createHttpClient, type FetchFn } from "#/server/http";
import { GMAIL_ID } from "../constants";
import {
	gmailMessageListSchema,
	gmailMessageSchema,
	gmailProfileSchema,
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

		listMessages: (q: string, maxResults = 15) =>
			http.get(`${base}/messages`, gmailMessageListSchema, { q, maxResults }),

		getMessageMetadata: (id: string) =>
			http.get(
				`${base}/messages/${encodeURIComponent(id)}`,
				gmailMessageSchema,
				{ format: "metadata", metadataHeaders: ["From", "Subject"] },
			),
	};
}

export type GmailApi = ReturnType<typeof createGmailApi>;
