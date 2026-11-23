export const GMAIL_ID = "gmail";

export const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

/** Messages fetched per list (each needs its own metadata request). */
export const MESSAGE_PAGE_SIZE = 15;

export const GMAIL_QUERIES = {
	unreadInbox: "is:unread in:inbox",
	starred: "is:starred",
} as const;
