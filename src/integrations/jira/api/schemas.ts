import { z } from "zod";

export const jiraAccessibleResourcesSchema = z.array(
	z.object({
		id: z.string(),
		url: z.string(),
		name: z.string(),
		scopes: z.array(z.string()).default([]),
	}),
);

const jiraUserSchema = z
	.object({
		displayName: z.string(),
		avatarUrls: z.record(z.string(), z.string()).optional(),
	})
	.nullable()
	.optional();

export const jiraIssueSchema = z.object({
	id: z.string(),
	key: z.string(),
	fields: z.object({
		summary: z.string(),
		updated: z.string(),
		status: z.object({ name: z.string() }).nullable().optional(),
		priority: z.object({ name: z.string() }).nullable().optional(),
		issuetype: z.object({ name: z.string() }).nullable().optional(),
		project: z
			.object({ key: z.string(), name: z.string() })
			.nullable()
			.optional(),
		reporter: jiraUserSchema,
		assignee: jiraUserSchema,
	}),
});

export const jiraSearchResponseSchema = z.object({
	issues: z.array(jiraIssueSchema),
	nextPageToken: z.string().optional(),
});

/** Persisted in the connection's meta at connect time. */
export const jiraSiteSchema = z.object({
	cloudId: z.string(),
	siteUrl: z.string(),
	siteName: z.string(),
});

export const jiraVersionSchema = z.object({
	id: z.string(),
	name: z.string(),
	released: z.boolean().default(false),
	archived: z.boolean().default(false),
	/** YYYY-MM-DD */
	releaseDate: z.string().optional(),
	overdue: z.boolean().optional(),
});

export const jiraVersionPageSchema = z.object({
	values: z.array(jiraVersionSchema).default([]),
});

export type JiraVersion = z.infer<typeof jiraVersionSchema>;
export type JiraIssue = z.infer<typeof jiraIssueSchema>;
export type JiraUser = NonNullable<z.infer<typeof jiraUserSchema>>;
export type JiraSite = z.infer<typeof jiraSiteSchema>;
