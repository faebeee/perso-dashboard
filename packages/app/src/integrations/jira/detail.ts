import type { JiraIssueDetailResponse } from "./api/schemas";

/** Newest comments shown in the detail view. */
export const DETAIL_COMMENT_LIMIT = 20;

export interface JiraPerson {
	name: string;
	avatarUrl?: string;
}

export interface JiraIssueDetail {
	key: string;
	url: string;
	siteUrl: string;
	summary: string;
	status?: string;
	priority?: string;
	type?: string;
	project?: string;
	parent?: { key: string; summary: string };
	labels: string[];
	reporter: JiraPerson | null;
	assignee: JiraPerson | null;
	/** YYYY-MM-DD */
	dueDate?: string;
	created: string;
	updated: string;
	/** Untrusted HTML rendered by Jira: show in SafeHtmlFrame only. */
	descriptionHtml?: string;
	comments: {
		id: string;
		author: JiraPerson | null;
		created: string;
		/** Untrusted HTML rendered by Jira. */
		bodyHtml: string;
	}[];
	/** Total comments on the issue (may exceed `comments`). */
	commentCount: number;
}

const person = (
	user:
		| { displayName: string; avatarUrls?: Record<string, string> }
		| null
		| undefined,
): JiraPerson | null =>
	user
		? { name: user.displayName, avatarUrl: user.avatarUrls?.["48x48"] }
		: null;

/** Pure: Jira issue (with renderedFields) → detail view model. */
export function toIssueDetail(
	issue: JiraIssueDetailResponse,
	siteUrl: string,
): JiraIssueDetail {
	const { fields } = issue;
	const renderedBodies = new Map(
		(issue.renderedFields?.comment?.comments ?? []).map((c) => [c.id, c.body]),
	);
	const comments = (fields.comment?.comments ?? [])
		.slice(-DETAIL_COMMENT_LIMIT)
		.map((c) => ({
			id: c.id,
			author: person(c.author),
			created: new Date(c.created).toISOString(),
			bodyHtml: renderedBodies.get(c.id) ?? "",
		}));
	const description = issue.renderedFields?.description?.trim();

	return {
		key: issue.key,
		url: new URL(`/browse/${issue.key}`, siteUrl).toString(),
		siteUrl,
		summary: fields.summary,
		status: fields.status?.name,
		priority: fields.priority?.name,
		type: fields.issuetype?.name,
		project: fields.project?.name,
		parent: fields.parent
			? { key: fields.parent.key, summary: fields.parent.fields.summary }
			: undefined,
		labels: fields.labels,
		reporter: person(fields.reporter),
		assignee: person(fields.assignee),
		dueDate: fields.duedate ?? undefined,
		created: new Date(fields.created).toISOString(),
		updated: new Date(fields.updated).toISOString(),
		descriptionHtml: description || undefined,
		comments,
		commentCount: fields.comment?.total ?? comments.length,
	};
}
