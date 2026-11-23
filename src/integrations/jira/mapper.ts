import type { Release } from "#/core/release";
import { makeWorkItemId, type WorkItem } from "#/core/work-item";
import type { JiraIssue, JiraUser, JiraVersion } from "./api/schemas";
import { JIRA_ID } from "./constants";

/** Pure: Jira issue → WorkItem. */
export function toWorkItem(issue: JiraIssue, siteUrl: string): WorkItem {
	const { fields } = issue;
	const tags = [fields.issuetype?.name, fields.priority?.name].filter(
		(tag): tag is string => Boolean(tag),
	);
	return {
		id: makeWorkItemId(JIRA_ID, issue.id),
		source: JIRA_ID,
		kind: "issue",
		title: fields.summary,
		url: new URL(`/browse/${issue.key}`, siteUrl).toString(),
		updatedAt: new Date(fields.updated).toISOString(),
		context: fields.project
			? `${issue.key} · ${fields.project.name}`
			: issue.key,
		project: fields.project?.name,
		detailRef: issue.key,
		status: fields.status?.name,
		actor: toPerson(fields.reporter) ?? undefined,
		assignee: toPerson(fields.assignee),
		tags,
	};
}

function toPerson(user: JiraUser | null | undefined) {
	if (!user) return null;
	return { name: user.displayName, avatarUrl: user.avatarUrls?.["48x48"] };
}

/** Pure: Jira fix version → Release. */
export function toRelease(
	version: JiraVersion,
	project: { key: string; name: string },
	siteUrl: string,
): Release {
	return {
		id: makeWorkItemId(JIRA_ID, `version:${version.id}`),
		source: JIRA_ID,
		name: version.name,
		url: new URL(
			`/projects/${project.key}/versions/${version.id}`,
			siteUrl,
		).toString(),
		project: project.name,
		state: version.released ? "released" : "upcoming",
		date: version.releaseDate,
		tags: !version.released && version.overdue ? ["Overdue"] : [],
	};
}
