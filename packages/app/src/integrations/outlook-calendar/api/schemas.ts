import { z } from "zod";

const emailAddressSchema = z
	.object({ name: z.string().nullish(), address: z.string().nullish() })
	.nullish();

/** With `Prefer: outlook.timezone="UTC"`, a UTC time without offset. */
const dateTimeSchema = z.object({
	dateTime: z.string(),
	timeZone: z.string().nullish(),
});

const responseSchema = z.object({ response: z.string().nullish() }).nullish();

export const graphUserSchema = z.object({
	mail: z.string().nullish(),
	userPrincipalName: z.string(),
});

export const graphEventSchema = z.object({
	id: z.string(),
	subject: z.string().nullish(),
	webLink: z.string().nullish(),
	isAllDay: z.boolean().nullish(),
	isCancelled: z.boolean().nullish(),
	isOrganizer: z.boolean().nullish(),
	start: dateTimeSchema,
	end: dateTimeSchema,
	location: z.object({ displayName: z.string().nullish() }).nullish(),
	onlineMeeting: z.object({ joinUrl: z.string().nullish() }).nullish(),
	onlineMeetingUrl: z.string().nullish(),
	/** Your reply: none, organizer, tentativelyAccepted, accepted, declined, notResponded. */
	responseStatus: responseSchema,
	organizer: z.object({ emailAddress: emailAddressSchema }).nullish(),
	attendees: z
		.array(
			z.object({
				/** required, optional or resource (rooms aren't people). */
				type: z.string().nullish(),
				status: responseSchema,
				emailAddress: emailAddressSchema,
			}),
		)
		.nullish(),
	body: z
		.object({
			contentType: z.string().nullish(),
			content: z.string().nullish(),
		})
		.nullish(),
});

export type GraphEvent = z.infer<typeof graphEventSchema>;

export const graphEventListSchema = z.object({
	value: z.array(graphEventSchema),
});

export const graphCalendarListSchema = z.object({
	value: z.array(
		z.object({
			id: z.string(),
			name: z.string().nullish(),
			hexColor: z.string().nullish(),
			isDefaultCalendar: z.boolean().nullish(),
			canEdit: z.boolean().nullish(),
			owner: z
				.object({ name: z.string().nullish(), address: z.string().nullish() })
				.nullish(),
		}),
	),
});

export type GraphCalendarList = z.infer<typeof graphCalendarListSchema>;
