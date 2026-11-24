import { IntegrationFailure } from "@dashboard/core/result";
import type { WorkItem } from "@dashboard/core/work-item";
import type { WorkScope } from "@dashboard/core/work-scope";
import type { JiraApi } from "./api/client";
import { type JiraIssue, type JiraSite, jiraSiteSchema } from "./api/schemas";
import {
	buildJql,
	DEFAULT_RELEASE_STATUSES,
	JIRA_DUE_ASSIGNED_JQL,
	JIRA_FILTERS,
	JIRA_ID,
	JIRA_SCOPE_CLAUSES,
	JIRA_UNASSIGNED_REPORTED_JQL,
	releaseStatusFilter,
} from "./constants";
import { toIssueDetail } from "./detail";
import { toWorkItem } from "./mapper";

export interface JiraServiceOptions {
	/** Workflow statuses for "On Release" (Preferences). */
	releaseStatuses?: readonly string[];
}

export function createJiraService(
	api: JiraApi,
	site: JiraSite,
	{ releaseStatuses = DEFAULT_RELEASE_STATUSES }: JiraServiceOptions = {},
) {
	const search = async (jql: string): Promise<WorkItem[]> => {
		const res = await api.searchIssues(site.cloudId, jql);
		return res.issues.map((issue) => toWorkItem(issue, site.siteUrl));
	};

	return {
		/**
		 * Issues related to a meeting: the ticket keys it mentions, plus issues
		 * updated since `since` whose text matches its keywords. A key that
		 * doesn't exist fails only its own search.
		 */
		async related(
			keys: readonly string[],
			keywords: readonly string[],
			since: Date,
		): Promise<WorkItem[]> {
			const keysJql = relatedKeysJql(keys);
			const textJql = relatedTextJql(keywords, since);
			const [byKey, byText] = await Promise.all([
				keysJql ? search(keysJql).catch(() => []) : [],
				textJql ? search(textJql) : [],
			]);
			const seen = new Set<string>();
			return [...byKey, ...byText]
				.filter((item) => !seen.has(item.id) && seen.add(item.id))
				.slice(0, RELATED_LIMIT);
		},

		/** Open issues I'm involved in; "all" = assigned to OR reported by me. */
		myIssues: (scope: WorkScope) =>
			search(
				buildJql(
					JIRA_FILTERS.open,
					JIRA_SCOPE_CLAUSES[scope === "all" ? "mine" : scope],
				),
			),

		/**
		 * Raw issues that may be urgent (keeps fields like the due date): every
		 * due/overdue issue assigned to me, plus my recently updated open
		 * issues (for priority). Deduplicated, due ones first.
		 */
		async urgentCandidates(): Promise<JiraIssue[]> {
			const [due, recent] = await Promise.all([
				api.searchIssues(site.cloudId, JIRA_DUE_ASSIGNED_JQL),
				api.searchIssues(
					site.cloudId,
					buildJql(JIRA_FILTERS.open, JIRA_SCOPE_CLAUSES.assigned),
				),
			]);
			const byId = new Map<string, JiraIssue>();
			for (const issue of [...due.issues, ...recent.issues]) {
				if (!byId.has(issue.id)) byId.set(issue.id, issue);
			}
			return [...byId.values()];
		},

		/** Raw issues you reported that nobody picked up (Waiting page). */
		unassignedReported: async () =>
			(await api.searchIssues(site.cloudId, JIRA_UNASSIGNED_REPORTED_JQL))
				.issues,

		/** One issue for the detail view. */
		issueDetail: async (key: string) =>
			toIssueDetail(await api.issue(site.cloudId, key), site.siteUrl),

		/** Issues in a release status; "all" = everyone's. */
		onRelease: (scope: WorkScope) =>
			search(
				buildJql(
					releaseStatusFilter(releaseStatuses),
					scope === "all" ? undefined : JIRA_SCOPE_CLAUSES[scope],
				),
			),
	};
}

/** The Jira site is chosen at connect time and stored in connection meta. */
export function readJiraSite(meta: Record<string, unknown>): JiraSite {
	const parsed = jiraSiteSchema.safeParse(meta);
	if (!parsed.success) {
		throw new IntegrationFailure({
			kind: "unauthorized",
			integrationId: JIRA_ID,
			message: "No Jira site stored for this connection. Reconnect Jira.",
		});
	}
	return parsed.data;
}

/** Picks the first Jira site the token can read. */
export async function resolveJiraSite(api: JiraApi): Promise<JiraSite> {
	const resources = await api.accessibleResources();
	const site =
		resources.find((r) => r.scopes.includes("read:jira-work")) ?? resources[0];
	if (!site) {
		throw new Error("This Atlassian account has no accessible Jira site");
	}
	return { cloudId: site.id, siteUrl: site.url, siteName: site.name };
}

/** Issues listed per meeting. */
const RELATED_LIMIT = 10;

const jqlString = (text: string) =>
	`"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

/** Pure: JQL for the ticket keys a meeting mentions (null when none). */
export function relatedKeysJql(keys: readonly string[]): string | null {
	const valid = keys.filter((k) => /^[A-Z][A-Z0-9_]+-\d+$/.test(k));
	return valid.length > 0
		? `issuekey in (${valid.join(", ")}) ORDER BY updated DESC`
		: null;
}

/** Pure: JQL for recent issues matching all keywords (null when none). */
export function relatedTextJql(
	keywords: readonly string[],
	since: Date,
): string | null {
	if (keywords.length === 0) return null;
	const day = since.toISOString().slice(0, 10);
	return `text ~ ${jqlString(keywords.join(" "))} AND updated >= "${day}" ORDER BY updated DESC`;
}
