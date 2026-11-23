import { textToHtml } from "#/lib/text-to-html";
import { fromBase64Url } from "#/platform/encoding";
import type { GmailFullMessage, GmailPart } from "./api/schemas";
import { gmailThreadUrl, senderName } from "./mapper";

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

const header = (part: GmailPart, name: string) =>
	part.headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;

function* walk(part: GmailPart): Generator<GmailPart> {
	yield part;
	for (const child of part.parts) yield* walk(child);
}

/** Decodes a part's base64url body using its declared charset (default UTF-8). */
export function decodePartBody(part: GmailPart): string {
	if (!part.body.data) return "";
	const charset =
		/charset="?([\w-]+)"?/i.exec(header(part, "Content-Type") ?? "")?.[1] ??
		"utf-8";
	const bytes = fromBase64Url(part.body.data);
	try {
		return new TextDecoder(charset).decode(bytes);
	} catch {
		return new TextDecoder("utf-8").decode(bytes); // unknown charset label
	}
}

/** `"A, B" <a@x>, b@y` → addresses (commas inside quotes don't split). */
export function parseAddressList(value: string | undefined): EmailAddress[] {
	if (!value) return [];
	return value
		.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
		.map((raw) => raw.trim())
		.filter(Boolean)
		.map((raw) => {
			const email = /<([^>]+)>/.exec(raw)?.[1] ?? raw.replace(/[<>]/g, "");
			return { name: senderName(raw), email: email.trim() };
		});
}

/** Pure: Gmail full message → detail view model. */
export function toEmailDetail(
	message: GmailFullMessage,
	accountEmail?: string,
): EmailDetail {
	const root = message.payload;
	const parts = [...walk(root)];
	const isAttachment = (p: GmailPart) =>
		p.filename !== "" ||
		/^attachment/i.test(header(p, "Content-Disposition") ?? "");
	const firstOf = (mimeType: string) =>
		parts.find(
			(p) => p.mimeType === mimeType && !isAttachment(p) && p.body.data,
		);

	const htmlPart = firstOf("text/html");
	const textPart = firstOf("text/plain");
	const html = htmlPart
		? decodePartBody(htmlPart)
		: textPart
			? textToHtml(decodePartBody(textPart))
			: "";

	const [from] = parseAddressList(header(root, "From"));
	const dateHeader = header(root, "Date");
	const parsedDate = dateHeader ? Date.parse(dateHeader) : Number.NaN;

	return {
		id: message.id,
		url: gmailThreadUrl(message.threadId, accountEmail),
		subject: header(root, "Subject")?.trim() || "(no subject)",
		from: from ?? null,
		to: parseAddressList(header(root, "To")),
		cc: parseAddressList(header(root, "Cc")),
		date: new Date(
			Number.isNaN(parsedDate) ? Number(message.internalDate) : parsedDate,
		).toISOString(),
		important: message.labelIds.includes("IMPORTANT"),
		unread: message.labelIds.includes("UNREAD"),
		html,
		hasRemoteImages: /<img\b[^>]*\bsrc\s*=\s*["']?https?:/i.test(html),
		attachments: parts.filter(isAttachment).map((p) => ({
			filename: p.filename || "attachment",
			mimeType: p.mimeType,
			size: p.body.size,
		})),
	};
}
