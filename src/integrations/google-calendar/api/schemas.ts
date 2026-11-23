import { z } from "zod";

const eventTimeSchema = z.object({
	/** Timed events */
	dateTime: z.string().optional(),
	/** All-day events (YYYY-MM-DD) */
	date: z.string().optional(),
});

export const googleCalendarSchema = z.object({
	id: z.string(),
	summary: z.string().optional(),
});

export const googleEventSchema = z.object({
	id: z.string(),
	status: z.string().optional(),
	htmlLink: z.string(),
	summary: z.string().optional(),
	location: z.string().optional(),
	start: eventTimeSchema,
	end: eventTimeSchema,
	hangoutLink: z.string().optional(),
	conferenceData: z
		.object({
			entryPoints: z
				.array(z.object({ entryPointType: z.string(), uri: z.string() }))
				.default([]),
		})
		.optional(),
	organizer: z.object({ self: z.boolean().optional() }).optional(),
	attendees: z
		.array(
			z.object({
				email: z.string().optional(),
				displayName: z.string().optional(),
				self: z.boolean().optional(),
				/** Meeting rooms and other resources aren't people. */
				resource: z.boolean().optional(),
				responseStatus: z.string().optional(),
			}),
		)
		.default([]),
});

/** One event (detail view): adds the description and organizer identity. */
export const googleEventDetailSchema = googleEventSchema.extend({
	description: z.string().optional(),
	organizer: z
		.object({
			email: z.string().optional(),
			displayName: z.string().optional(),
			self: z.boolean().optional(),
		})
		.optional(),
	attendees: z
		.array(
			z.object({
				email: z.string().optional(),
				displayName: z.string().optional(),
				self: z.boolean().optional(),
				resource: z.boolean().optional(),
				optional: z.boolean().optional(),
				organizer: z.boolean().optional(),
				responseStatus: z.string().optional(),
			}),
		)
		.default([]),
});

export type GoogleEventDetail = z.infer<typeof googleEventDetailSchema>;

export const googleEventListSchema = z.object({
	items: z.array(googleEventSchema).default([]),
});

export type GoogleEvent = z.infer<typeof googleEventSchema>;

/** GET /users/me/calendarList: every calendar in your Google Calendar list. */
export const googleCalendarListSchema = z.object({
	items: z
		.array(
			z.object({
				id: z.string(),
				summary: z.string().default(""),
				/** Your own name for it, when you renamed it. */
				summaryOverride: z.string().optional(),
				primary: z.boolean().optional(),
				backgroundColor: z.string().optional(),
				/** owner | writer | reader | freeBusyReader */
				accessRole: z.string().optional(),
			}),
		)
		.default([]),
});

export type GoogleCalendarList = z.infer<typeof googleCalendarListSchema>;
