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

export type GmailMessage = z.infer<typeof gmailMessageSchema>;
