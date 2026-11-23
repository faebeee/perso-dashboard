import type { EmailAddress } from "#/core/email";
import { makeWorkItemId, type WorkItem } from "#/core/work-item";
import type { GraphMessage, GraphRecipient } from "./api/schemas";
import { OUTLOOK_ID } from "./constants";

/** Graph recipient → address; null when it has neither name nor address. */
export function toAddress(recipient: GraphRecipient | null | undefined) {
	const email = recipient?.emailAddress?.address?.trim() ?? "";
	const name = recipient?.emailAddress?.name?.trim() || email;
	return name ? ({ name, email } satisfies EmailAddress) : null;
}

export const toAddresses = (
	recipients: readonly GraphRecipient[] | null | undefined,
): EmailAddress[] =>
	(recipients ?? [])
		.map(toAddress)
		.filter((a): a is EmailAddress => a !== null);

/** When it arrived, or (in Sent Items) when you sent it. */
export const messageDate = (message: GraphMessage) =>
	message.receivedDateTime ?? message.sentDateTime ?? new Date(0).toISOString();

/** Outlook on the web; Graph returns the right host (work or personal). */
export const messageUrl = (message: GraphMessage) =>
	message.webLink ?? "https://outlook.office.com/mail/";

/** Pure: Graph message → WorkItem. */
export function toWorkItem(message: GraphMessage): WorkItem {
	return {
		id: makeWorkItemId(OUTLOOK_ID, message.id),
		source: OUTLOOK_ID,
		kind: "email",
		title: message.subject?.trim() || "(no subject)",
		url: messageUrl(message),
		updatedAt: new Date(messageDate(message)).toISOString(),
		context: message.bodyPreview?.replace(/\s+/g, " ").trim() || undefined,
		actor: { name: toAddress(message.from)?.name ?? "Unknown sender" },
		tags: message.importance === "high" ? ["Important"] : [],
		detailRef: message.id,
	};
}
