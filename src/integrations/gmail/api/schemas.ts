import { z } from "zod";

export const gmailProfileSchema = z.object({
	emailAddress: z.string(),
});

export const gmailMessageListSchema = z.object({
	messages: z
		.array(z.object({ id: z.string(), threadId: z.string() }))
		.default([]),
	resultSizeEstimate: z.number().optional(),
});

export const gmailMessageSchema = z.object({
	id: z.string(),
	threadId: z.string(),
	snippet: z.string().default(""),
	internalDate: z.string(),
	labelIds: z.array(z.string()).default([]),
	payload: z.object({
		headers: z
			.array(z.object({ name: z.string(), value: z.string() }))
			.default([]),
	}),
});

/** Totals of a system label (INBOX, STARRED…). */
export const gmailLabelSchema = z.object({
	id: z.string(),
	messagesTotal: z.number().default(0),
	messagesUnread: z.number().default(0),
	threadsTotal: z.number().default(0),
	threadsUnread: z.number().default(0),
});

export type GmailMessage = z.infer<typeof gmailMessageSchema>;

const gmailHeaderSchema = z.object({ name: z.string(), value: z.string() });

/** One node of the MIME tree (format=full). Bodies are base64url. */
export const gmailPartSchema = z.object({
	mimeType: z.string(),
	filename: z.string().default(""),
	headers: z.array(gmailHeaderSchema).default([]),
	body: z.object({
		size: z.number().default(0),
		data: z.string().optional(),
		attachmentId: z.string().optional(),
	}),
	get parts() {
		return z.array(gmailPartSchema).default([]);
	},
});

export type GmailPart = z.infer<typeof gmailPartSchema>;

export const gmailFullMessageSchema = z.object({
	id: z.string(),
	threadId: z.string(),
	snippet: z.string().default(""),
	internalDate: z.string(),
	labelIds: z.array(z.string()).default([]),
	payload: gmailPartSchema,
});

export type GmailFullMessage = z.infer<typeof gmailFullMessageSchema>;
