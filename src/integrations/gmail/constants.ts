export const GMAIL_ID = "gmail";

export const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

export const GMAIL_QUERIES = {
	unreadInbox: "is:unread in:inbox",
} as const;
