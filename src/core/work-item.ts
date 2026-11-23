import { z } from "zod";

const personSchema = z.object({
	name: z.string(),
	avatarUrl: z.string().optional(),
});

/**
 * The normalized unit of "work" every integration maps its data into.
 * Widgets and the unified feed only ever deal with WorkItems, never with
 * provider-specific payloads.
 */
export const workItemSchema = z.object({
	/** Globally unique: `${source}:${nativeId}` */
	id: z.string(),
	/** Integration id, e.g. "github" */
	source: z.string(),
	/** pull_request = you opened it; assigned_pull_request = assigned to you only. */
	kind: z.enum([
		"pull_request",
		"assigned_pull_request",
		"review_request",
		"issue",
		"email",
	]),
	title: z.string(),
	url: z.string(),
	/** ISO-8601 timestamp used for sorting. */
	updatedAt: z.string(),
	/** Short secondary text: repo name, issue key, email snippet… */
	context: z.string().optional(),
	/** Repository or project the item belongs to, for grouping. */
	project: z.string().optional(),
	status: z.string().optional(),
	/** Who created/sent it (author, reporter, sender). */
	actor: personSchema.optional(),
	/**
	 * Who it's assigned to. `null` = explicitly unassigned,
	 * `undefined` = not applicable for this kind of item.
	 */
	assignee: personSchema.nullable().optional(),
	/**
	 * Opaque reference the source's in-app detail view understands (Jira issue
	 * key, Gmail message id…). Absent = the item only opens in the browser.
	 */
	detailRef: z.string().optional(),
	/** Free-form labels (priority, draft, issue type…). */
	tags: z.array(z.string()).optional(),
});

export type WorkItem = z.infer<typeof workItemSchema>;
export type WorkItemKind = WorkItem["kind"];

export function makeWorkItemId(source: string, nativeId: string | number) {
	return `${source}:${nativeId}`;
}

export function sortByUpdatedDesc(items: readonly WorkItem[]): WorkItem[] {
	return [...items].sort(
		(a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
	);
}
