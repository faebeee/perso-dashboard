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
	created_at: z.string().optional(),
	closed_at: z.string().nullable().optional(),
	/** Present on PRs; merged_at set once merged. */
	pull_request: z
		.object({ merged_at: z.string().nullable().optional() })
		.optional(),
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

/** GET /repos/{o}/{r}/pulls/{n} with Accept: application/vnd.github.full+json. */
export const githubPullSchema = z.object({
	number: z.number(),
	title: z.string(),
	html_url: z.string(),
	state: z.string(),
	draft: z.boolean().optional(),
	merged_at: z.string().nullable().optional(),
	created_at: z.string(),
	updated_at: z.string(),
	/** Rendered Markdown (needs the "full" media type). */
	body_html: z.string().nullable().optional(),
	user: githubUserSchema.nullable(),
	head: z.object({ ref: z.string(), sha: z.string() }),
	base: z.object({ ref: z.string() }),
	additions: z.number().default(0),
	deletions: z.number().default(0),
	changed_files: z.number().default(0),
	labels: z.array(z.object({ name: z.string() })).default([]),
	requested_reviewers: z.array(githubUserSchema).default([]),
	requested_teams: z.array(z.object({ name: z.string() })).default([]),
});

export const githubReviewListSchema = z.array(
	z.object({
		user: githubUserSchema.nullable(),
		state: z.string(),
		submitted_at: z.string().nullable().optional(),
	}),
);

export const githubPullFileListSchema = z.array(
	z.object({
		filename: z.string(),
		status: z.string(),
		additions: z.number().default(0),
		deletions: z.number().default(0),
	}),
);

export const githubCheckRunsSchema = z.object({
	check_runs: z
		.array(
			z.object({
				name: z.string(),
				status: z.string(),
				conclusion: z.string().nullable().optional(),
				html_url: z.string().nullable().optional(),
			}),
		)
		.default([]),
});

export const githubCombinedStatusSchema = z.object({
	statuses: z
		.array(
			z.object({
				context: z.string(),
				state: z.string(),
				target_url: z.string().nullable().optional(),
			}),
		)
		.default([]),
});

export type GitHubPull = z.infer<typeof githubPullSchema>;
export type GitHubReviewList = z.infer<typeof githubReviewListSchema>;
export type GitHubPullFileList = z.infer<typeof githubPullFileListSchema>;
export type GitHubCheckRuns = z.infer<typeof githubCheckRunsSchema>;
export type GitHubCombinedStatus = z.infer<typeof githubCombinedStatusSchema>;
