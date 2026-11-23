import { sortByUpdatedDesc, type WorkItem } from "#/core/work-item";
import {
	type Collected,
	collectFromSources,
	type Source,
} from "#/lib/collect-sources";

export type FeedSource = Source<WorkItem>;
export type FeedResult = Collected<WorkItem>;

/**
 * Fetch all sources in parallel, tolerate partial failure, dedupe by URL and
 * sort newest first.
 */
export async function aggregateFeed(
	sources: readonly FeedSource[],
	limit = 100,
): Promise<FeedResult> {
	const { items, errors } = await collectFromSources(sources);

	const seen = new Set<string>();
	const unique = items.filter((item) => {
		if (seen.has(item.url)) return false;
		seen.add(item.url);
		return true;
	});

	return { items: sortByUpdatedDesc(unique).slice(0, limit), errors };
}
