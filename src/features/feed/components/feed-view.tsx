import { useQuery } from "@tanstack/react-query";
import { QueryState } from "#/components/widget-kit/query-state";
import { feedQueries } from "../queries";
import { FeedList } from "./feed-list";

interface FeedViewProps {
	compact?: boolean;
}

/** Feed with data loading. Used by both the /feed page and the feed widget. */
export function FeedView({ compact = false }: FeedViewProps) {
	const query = useQuery(feedQueries.all());
	return (
		<QueryState query={query}>
			{(feed) => (
				<FeedList
					items={feed.items}
					errors={feed.errors}
					filterable={!compact}
					limit={compact ? 25 : undefined}
				/>
			)}
		</QueryState>
	);
}
