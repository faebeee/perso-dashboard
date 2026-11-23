import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { QueryState } from "#/components/widget-kit/query-state";
import type { WorkItemSource } from "#/components/work-item/work-item-list";
import type { IntegrationManifest } from "#/core/integration";
import { feedQueries } from "../queries";
import { FeedList } from "./feed-list";

interface FeedViewProps {
	integrations: readonly IntegrationManifest[];
	compact?: boolean;
}

/** Feed with data loading. Used by both the /feed page and the feed widget. */
export function FeedView({ integrations, compact = false }: FeedViewProps) {
	const query = useQuery(feedQueries.all());
	const sources = useMemo(
		() =>
			Object.fromEntries(
				integrations.map((i): [string, WorkItemSource] => [
					i.id,
					{ name: i.name, icon: i.icon },
				]),
			),
		[integrations],
	);

	return (
		<QueryState query={query}>
			{(feed) => (
				<FeedList
					items={feed.items}
					errors={feed.errors}
					sources={sources}
					filterable={!compact}
					limit={compact ? 25 : undefined}
				/>
			)}
		</QueryState>
	);
}
