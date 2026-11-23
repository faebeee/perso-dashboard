export const OUTLOOK_ID = "outlook";

/** Read-only mail; MICROSOFT_OAUTH_CLIENT adds offline_access and User.Read. */
export const OUTLOOK_SCOPES = ["Mail.Read"];

/** Messages fetched per list. */
export const MESSAGE_PAGE_SIZE = 15;

/** Messages of one conversation read to see who wrote last (Waiting). */
export const CONVERSATION_PAGE_SIZE = 25;

/** Fields every list needs (keeps responses small). */
export const MESSAGE_LIST_FIELDS = [
	"id",
	"conversationId",
	"subject",
	"bodyPreview",
	"from",
	"toRecipients",
	"receivedDateTime",
	"sentDateTime",
	"importance",
	"isRead",
	"webLink",
].join(",");

/** OData string literal: single quotes are doubled. */
export const odataString = (value: string) => `'${value.replace(/'/g, "''")}'`;

/** Graph search query for mail with any of these people. */
export const withPeopleSearch = (people: readonly string[]) =>
	`"${people.map((p) => `participants:${p.replace(/"/g, "")}`).join(" OR ")}"`;
