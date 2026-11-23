import { IntegrationFailure } from "@dashboard/core/result";
import { makeWorkItemId, type WorkItem } from "@dashboard/core/work-item";
import type { GitHubApi } from "./api/client";
import type { GitHubDependabotAlertList, GitHubRepoList } from "./api/schemas";
import { DEPENDABOT_REPO_LIMIT, GITHUB_ID } from "./constants";
import { hasGitHubScope } from "./scopes";

export const SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_LABELS: Record<Severity, string> = {
	critical: "Critical",
	high: "High",
	medium: "Medium",
	low: "Low",
};

const rank = (severity: string) => {
	const i = SEVERITIES.indexOf(severity as Severity);
	return i === -1 ? SEVERITIES.length : i;
};

export interface DependabotResult {
	/** Most severe first, then oldest first. */
	items: WorkItem[];
	/** Repositories whose alerts were read. */
	checkedRepos: number;
	/** Repositories skipped: Dependabot off, alerts hidden from you, or errors. */
	skippedRepos: number;
}

/** Pure: repositories worth checking: active, and you can write to them. */
export function reposToCheck(
	repos: GitHubRepoList,
	limit = DEPENDABOT_REPO_LIMIT,
): string[] {
	return repos
		.filter((r) => !r.archived && (r.permissions?.admin || r.permissions?.push))
		.slice(0, limit)
		.map((r) => r.full_name);
}

/** Pure: Dependabot alerts of one repo → WorkItems (severity as status). */
export function alertsToWorkItems(
	repo: string,
	alerts: GitHubDependabotAlertList,
): WorkItem[] {
	return alerts.map((alert) => {
		const severity =
			alert.security_advisory.severity in SEVERITY_LABELS
				? SEVERITY_LABELS[alert.security_advisory.severity as Severity]
				: alert.security_advisory.severity;
		const pkg = alert.dependency.package;
		const fix = alert.security_vulnerability?.first_patched_version?.identifier;
		return {
			id: makeWorkItemId(GITHUB_ID, `dependabot:${repo}#${alert.number}`),
			source: GITHUB_ID,
			kind: "security_alert",
			title: `${pkg.name}: ${alert.security_advisory.summary}`,
			url: alert.html_url,
			updatedAt: new Date(alert.created_at).toISOString(),
			context: [
				repo,
				alert.security_advisory.cve_id ?? alert.security_advisory.ghsa_id,
			]
				.filter(Boolean)
				.join(" · "),
			project: repo,
			status: severity,
			tags: [pkg.ecosystem, fix ? `Fix: ${fix}` : "No fix yet"],
		};
	});
}

/** Pure: most severe first, then the oldest (longest exposed) first. */
export function sortAlerts(items: WorkItem[]): WorkItem[] {
	return [...items].sort(
		(a, b) =>
			rank((a.status ?? "").toLowerCase()) -
				rank((b.status ?? "").toLowerCase()) ||
			Date.parse(a.updatedAt) - Date.parse(b.updatedAt),
	);
}

/** Open Dependabot alerts across the repositories you can write to. */
export function createDependabotService(api: GitHubApi) {
	return {
		async openAlerts(
			scopes: readonly string[] | undefined,
		): Promise<DependabotResult> {
			// `repo` (or `security_events` itself) is needed; `repo` implies it.
			if (scopes && !hasGitHubScope(scopes, "security_events")) {
				throw new IntegrationFailure({
					kind: "unauthorized",
					integrationId: GITHUB_ID,
					message:
						"Reconnect GitHub with repository access to read Dependabot alerts.",
				});
			}
			const repos = reposToCheck(await api.userRepos());
			const results = await Promise.allSettled(
				repos.map(async (repo) =>
					alertsToWorkItems(repo, await api.dependabotAlerts(repo)),
				),
			);
			const items = results.flatMap((r) =>
				r.status === "fulfilled" ? r.value : [],
			);
			return {
				items: sortAlerts(items),
				checkedRepos: results.filter((r) => r.status === "fulfilled").length,
				skippedRepos: results.filter((r) => r.status === "rejected").length,
			};
		},
	};
}
