import { z } from "zod";

const emailAddressSchema = z.object({
	emailAddress: z
		.object({
			name: z.string().nullish(),
			address: z.string().nullish(),
		})
		.nullish(),
});

export type GraphRecipient = z.infer<typeof emailAddressSchema>;

export const graphUserSchema = z.object({
	displayName: z.string().nullish(),
	/** Null for some personal accounts: fall back to userPrincipalName. */
	mail: z.string().nullish(),
	userPrincipalName: z.string(),
});

export const graphMessageSchema = z.object({
	id: z.string(),
	conversationId: z.string().nullish(),
	subject: z.string().nullish(),
	bodyPreview: z.string().nullish(),
	from: emailAddressSchema.nullish(),
	toRecipients: z.array(emailAddressSchema).nullish(),
	ccRecipients: z.array(emailAddressSchema).nullish(),
	receivedDateTime: z.string().nullish(),
	sentDateTime: z.string().nullish(),
	importance: z.string().nullish(),
	isRead: z.boolean().nullish(),
	webLink: z.string().nullish(),
	body: z
		.object({
			contentType: z.string().nullish(),
			content: z.string().nullish(),
		})
		.nullish(),
});

export type GraphMessage = z.infer<typeof graphMessageSchema>;

export const graphMessageListSchema = z.object({
	value: z.array(graphMessageSchema),
	/** Present when `$count=true` was requested. */
	"@odata.count": z.number().optional(),
});

export type GraphMessageList = z.infer<typeof graphMessageListSchema>;

export const graphMailFolderSchema = z.object({
	totalItemCount: z.number(),
	unreadItemCount: z.number(),
});

export const graphAttachmentListSchema = z.object({
	value: z.array(
		z.object({
			name: z.string().nullish(),
			contentType: z.string().nullish(),
			size: z.number().nullish(),
			/** Images embedded in the body aren't listed as attachments. */
			isInline: z.boolean().nullish(),
		}),
	),
});

export type GraphAttachmentList = z.infer<typeof graphAttachmentListSchema>;
