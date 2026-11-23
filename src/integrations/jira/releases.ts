import { type Release, type ReleaseQuery, releaseDateMs } from "#/core/release";
import { settleLeniently } from "#/lib/collect-sources";
import type { JiraApi } from "./api/client";
import type { JiraSite } from "./api/schemas";
import { involvedIssuesSince, RELEASE_PROJECT_LIMIT } from "./constants";
import { toRelease } from "./mapper";

/**
 * Fix versions of the projects you've recently worked in. Projects are
 * detected from issues assigned to or reported by you in the release window.
 */
export function createJiraReleaseService(api: JiraApi, site: JiraSite) {
	async function activeProjects(since: Date) {
		const day = since.toISOString().slice(0, 10);
		const res = await api.searchIssues(
			site.cloudId,
			involvedIssuesSince(day),
			100,
		);
		const projects = new Map<string, { key: string; name: string }>();
		for (const issue of res.issues) {
			const project = issue.fields.project;
			if (project) projects.set(project.key, project);
		}
		return [...projects.values()].slice(0, RELEASE_PROJECT_LIMIT);
	}

	return {
		async releases({ releasedSince }: ReleaseQuery): Promise<Release[]> {
			const projects = await activeProjects(releasedSince);
			const perProject = await settleLeniently(
				projects.map(async (project) => {
					const page = await api.projectVersions(site.cloudId, project.key);
					return page.values
						.filter((v) => !v.archived)
						.map((v) => toRelease(v, project, site.siteUrl));
				}),
			);
			return perProject
				.flat()
				.filter(
					(r) =>
						r.state === "upcoming" ||
						(r.date !== undefined &&
							releaseDateMs(r.date) >= releasedSince.getTime()),
				);
		},
	};
}
