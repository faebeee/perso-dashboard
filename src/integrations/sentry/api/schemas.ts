import { z } from "zod";

/** Only the fields we use; zod strips the rest. */

export const sentryOrganizationSchema = z.object({
	slug: z.string(),
	name: z.string(),
	links: z.object({ regionUrl: z.string().optional() }).partial().optional(),
});

export const sentryOrganizationListSchema = z.array(sentryOrganizationSchema);

export const sentryIssueSchema = z.object({
	id: z.string(),
	shortId: z.string(),
	title: z.string(),
	culprit: z.string().nullable().optional(),
	permalink: z.string(),
	level: z.string().default("error"),
	status: z.string(),
	/** "new" | "ongoing" | "escalating" | "regressed" | … (null on old issues). */
	substatus: z.string().nullable().optional(),
	/** Event count as a string (can exceed JS safe integers). */
	count: z.coerce.string().default("0"),
	userCount: z.number().default(0),
	firstSeen: z.string(),
	lastSeen: z.string(),
	project: z.object({ slug: z.string(), name: z.string() }),
	assignedTo: z
		.object({
			type: z.enum(["user", "team"]),
			name: z.string(),
		})
		.nullable()
		.optional(),
	isUnhandled: z.boolean().optional(),
});

export const sentryIssueListSchema = z.array(sentryIssueSchema);

export type SentryOrganization = z.infer<typeof sentryOrganizationSchema>;
export type SentryIssue = z.infer<typeof sentryIssueSchema>;

/** Persisted in the connection's meta at connect time. */
export const sentryMetaSchema = z.object({
	user: z.string().optional(),
	organizations: z
		.array(z.object({ slug: z.string(), name: z.string(), apiUrl: z.string() }))
		.min(1),
});

export type SentryMeta = z.infer<typeof sentryMetaSchema>;
export type SentryOrg = SentryMeta["organizations"][number];
