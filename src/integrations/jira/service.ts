import { IntegrationFailure } from "#/core/result";
import type { WorkItem } from "#/core/work-item";
import type { WorkScope } from "#/core/work-scope";
import type { JiraApi } from "./api/client";
import { type JiraIssue, type JiraSite, jiraSiteSchema } from "./api/schemas";
import {
	buildJql,
	JIRA_DUE_ASSIGNED_JQL,
	JIRA_FILTERS,
	JIRA_ID,
	JIRA_SCOPE_CLAUSES,
} from "./constants";
import { toWorkItem } from "./mapper";

export function createJiraService(api: JiraApi, site: JiraSite) {
	const search = async (jql: string): Promise<WorkItem[]> => {
		const res = await api.searchIssues(site.cloudId, jql);
		return res.issues.map((issue) => toWorkItem(issue, site.siteUrl));
	};

	return {
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

		/** Issues in a release status; "all" = everyone's. */
		onRelease: (scope: WorkScope) =>
			search(
				buildJql(
					JIRA_FILTERS.onRelease,
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
