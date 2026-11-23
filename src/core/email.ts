/** One email in full, for the (provider-agnostic) detail view. */

export interface EmailAddress {
	name: string;
	email: string;
}

export interface EmailDetail {
	id: string;
	url: string;
	subject: string;
	from: EmailAddress | null;
	to: EmailAddress[];
	cc: EmailAddress[];
	/** ISO timestamp. */
	date: string;
	important: boolean;
	unread: boolean;
	/** Untrusted HTML: show in SafeHtmlFrame only. Plain-text mail is converted. */
	html: string;
	/** True when `html` references remote (http/https) images. */
	hasRemoteImages: boolean;
	attachments: { filename: string; mimeType: string; size: number }[];
}

/** Remote (http/https) images can tell the sender you opened the mail. */
export const hasRemoteImages = (html: string) =>
	/<img\b[^>]*\bsrc\s*=\s*["']?https?:/i.test(html);
