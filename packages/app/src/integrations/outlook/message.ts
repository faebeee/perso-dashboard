import { type EmailDetail, hasRemoteImages } from "@dashboard/core/email";
import { textToHtml } from "#/lib/text-to-html";
import type { GraphAttachmentList, GraphMessage } from "./api/schemas";
import { messageDate, messageUrl, toAddress, toAddresses } from "./mapper";

/** Pure: Graph message (+ its attachments) → detail view model. */
export function toEmailDetail(
	message: GraphMessage,
	attachments: GraphAttachmentList,
): EmailDetail {
	const content = message.body?.content ?? "";
	// The client asks for HTML; plain text is still possible (e.g. old items).
	const html =
		message.body?.contentType?.toLowerCase() === "text"
			? textToHtml(content)
			: content;
	return {
		id: message.id,
		url: messageUrl(message),
		subject: message.subject?.trim() || "(no subject)",
		from: toAddress(message.from),
		to: toAddresses(message.toRecipients),
		cc: toAddresses(message.ccRecipients),
		date: new Date(messageDate(message)).toISOString(),
		important: message.importance === "high",
		unread: message.isRead === false,
		html,
		hasRemoteImages: hasRemoteImages(html),
		attachments: attachments.value
			.filter((a) => !a.isInline)
			.map((a) => ({
				filename: a.name || "attachment",
				mimeType: a.contentType ?? "application/octet-stream",
				size: a.size ?? 0,
			})),
	};
}
