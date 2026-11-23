import { useQuery } from "@tanstack/react-query";
import { Rocket } from "lucide-react";
import { ReleaseList } from "#/components/release/release-list";
import { QueryState } from "#/components/widget-kit/query-state";
import { SourceErrors } from "#/components/widget-kit/source-errors";
import type { WorkItemSource } from "#/components/work-item/work-item-list";
import type { IntegrationManifest } from "#/core/integration";
import { RECENT_RELEASE_DAYS } from "#/core/release";
import type { WidgetDefinition } from "#/core/widget";
import { releaseQueries } from "./queries";

/** Built-in widget combining releases from every integration that has them. */
export function createReleasesWidget(
	integrations: readonly IntegrationManifest[],
): WidgetDefinition {
	const sources: Record<string, WorkItemSource> = Object.fromEntries(
		integrations.map((i) => [i.id, { name: i.name, icon: i.icon }]),
	);

	function ReleasesWidget() {
		const query = useQuery(releaseQueries.all());
		return (
			<QueryState query={query}>
				{({ items, errors }) => (
					<div className="space-y-2">
						<SourceErrors
							errors={errors}
							nameOf={(id) => (id ? sources[id]?.name : undefined)}
						/>
						{items.length === 0 ? (
							<p className="py-8 text-center text-sm text-muted-foreground">
								No upcoming releases and nothing shipped in the last{" "}
								{RECENT_RELEASE_DAYS} days.
							</p>
						) : (
							<ReleaseList releases={items} sources={sources} />
						)}
					</div>
				)}
			</QueryState>
		);
	}

	return {
		type: "core.releases",
		title: "Releases",
		description: `Upcoming releases and those shipped in the last ${RECENT_RELEASE_DAYS} days, from GitHub and Jira.`,
		icon: Rocket,
		defaultSize: { w: 4, h: 10 },
		minSize: { w: 3, h: 5 },
		Component: ReleasesWidget,
	};
}
