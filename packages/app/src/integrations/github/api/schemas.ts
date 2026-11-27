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

/** GET /users/{login}/events: your activity across all repos and branches. */
export const githubEventListSchema = z.array(
	z.object({
		id: z.string(),
		type: z.string(),
		created_at: z.string(),
		repo: z.object({ name: z.string() }),
		payload: z.record(z.string(), z.unknown()).default({}),
	}),
);

/**
 * A PushEvent's payload. Since Oct 2025 GitHub omits the commit list here;
 * `before`/`head` are what's left, and the commits come from the compare API.
 */
export const githubPushPayloadSchema = z.object({
	ref: z.string(),
	head: z.string(),
	before: z.string(),
	commits: z
		.array(
			z.object({
				sha: z.string(),
				message: z.string(),
				distinct: z.boolean().optional(),
			}),
		)
		.optional(),
});

/**
 * GET /repos/{o}/{r}/activity: the repository's own push log. Unlike the
 * user events feed, it doesn't drop events, so it backs up that feed.
 */
export const githubRepoActivityListSchema = z.array(
	z.object({
		activity_type: z.string(),
		ref: z.string(),
		before: z.string(),
		after: z.string(),
		timestamp: z.string(),
	}),
);

export type GitHubRepoActivityList = z.infer<
	typeof githubRepoActivityListSchema
>;

export const githubCommitSchema = z.object({
	sha: z.string(),
	html_url: z.string(),
	commit: z.object({
		message: z.string(),
		author: z.object({ date: z.string() }).nullable().optional(),
	}),
	/** null when the commit email isn't linked to a GitHub account. */
	author: githubUserSchema.nullable().optional(),
});

export const githubCompareSchema = z.object({
	commits: z.array(githubCommitSchema).default([]),
});

export type GitHubEventList = z.infer<typeof githubEventListSchema>;
export type GitHubCommit = z.infer<typeof githubCommitSchema>;

/** GET /user/repos: repositories you can access, with your permissions. */
export const githubRepoListSchema = z.array(
	z.object({
		full_name: z.string(),
		private: z.boolean().optional(),
		archived: z.boolean().default(false),
		pushed_at: z.string().nullable().optional(),
		permissions: z
			.object({
				admin: z.boolean().default(false),
				push: z.boolean().default(false),
			})
			.partial()
			.optional(),
	}),
);

/** GET /repos/{o}/{r}/dependabot/alerts (only the fields we show). */
export const githubDependabotAlertListSchema = z.array(
	z.object({
		number: z.number(),
		state: z.string(),
		html_url: z.string(),
		created_at: z.string(),
		dependency: z.object({
			package: z.object({ ecosystem: z.string(), name: z.string() }),
			manifest_path: z.string().optional(),
			scope: z.string().nullable().optional(),
		}),
		security_advisory: z.object({
			ghsa_id: z.string(),
			cve_id: z.string().nullable().optional(),
			summary: z.string(),
			severity: z.string(),
		}),
		security_vulnerability: z
			.object({
				vulnerable_version_range: z.string().optional(),
				first_patched_version: z
					.object({ identifier: z.string() })
					.nullable()
					.optional(),
			})
			.optional(),
	}),
);

export type GitHubRepoList = z.infer<typeof githubRepoListSchema>;

export const githubRepoSchema = z.object({ default_branch: z.string() });
export type GitHubDependabotAlertList = z.infer<
	typeof githubDependabotAlertListSchema
>;
