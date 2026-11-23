import { z } from "zod";

/** Only the fields we use; zod strips the rest. */

export const githubUserSchema = z.object({
	login: z.string(),
	avatar_url: z.string().optional(),
});

export const githubSearchItemSchema = z.object({
	id: z.number(),
	number: z.number(),
	title: z.string(),
	html_url: z.string(),
	updated_at: z.string(),
	state: z.string(),
	draft: z.boolean().optional(),
	repository_url: z.string(),
	user: githubUserSchema.nullable(),
	labels: z.array(z.object({ name: z.string() })).default([]),
});

export const githubSearchResponseSchema = z.object({
	total_count: z.number(),
	items: z.array(githubSearchItemSchema),
});

export const githubReleaseSchema = z.object({
	id: z.number(),
	name: z.string().nullable(),
	tag_name: z.string(),
	html_url: z.string(),
	draft: z.boolean(),
	prerelease: z.boolean(),
	published_at: z.string().nullable(),
	created_at: z.string(),
});

export const githubReleaseListSchema = z.array(githubReleaseSchema);

export type GitHubRelease = z.infer<typeof githubReleaseSchema>;
export type GitHubSearchItem = z.infer<typeof githubSearchItemSchema>;
