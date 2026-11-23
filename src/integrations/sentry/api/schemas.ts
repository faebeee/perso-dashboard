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

/** An issue as returned by search, tagged with the organization it came from. */
export type SentryIssueInOrg = z.infer<typeof sentryIssueSchema> & {
	orgSlug?: string;
};

const sentryFrameSchema = z.object({
	filename: z.string().nullable().optional(),
	absPath: z.string().nullable().optional(),
	module: z.string().nullable().optional(),
	function: z.string().nullable().optional(),
	lineNo: z.number().nullable().optional(),
	colNo: z.number().nullable().optional(),
	inApp: z.boolean().nullable().optional(),
	/** [[lineNo, code], …] around the frame. */
	context: z.array(z.tuple([z.number(), z.string().nullable()])).default([]),
});

/** GET …/issues/{id}/events/latest/ (only the parts we show). */
export const sentryEventSchema = z.object({
	eventID: z.string(),
	dateCreated: z.string().optional(),
	message: z.string().nullable().optional(),
	tags: z.array(z.object({ key: z.string(), value: z.string() })).default([]),
	user: z
		.object({
			email: z.string().nullable().optional(),
			username: z.string().nullable().optional(),
			id: z.string().nullable().optional(),
		})
		.nullable()
		.optional(),
	entries: z
		.array(
			z.object({
				type: z.string(),
				data: z.unknown(),
			}),
		)
		.default([]),
});

export const sentryExceptionDataSchema = z.object({
	values: z
		.array(
			z.object({
				type: z.string().nullable().optional(),
				value: z.string().nullable().optional(),
				mechanism: z
					.object({ handled: z.boolean().nullable().optional() })
					.nullable()
					.optional(),
				stacktrace: z
					.object({ frames: z.array(sentryFrameSchema).default([]) })
					.nullable()
					.optional(),
			}),
		)
		.default([]),
});

export type SentryEvent = z.infer<typeof sentryEventSchema>;

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
