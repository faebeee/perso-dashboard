import { queryOptions } from "@tanstack/react-query";
import { lastWeeks, type SummaryRange, summaryRange } from "#/core/insights";
import { queryKeys } from "#/lib/query-keys";
import { localDayKey } from "#/lib/time";
import { fetchActivity, fetchMetrics } from "./fetchers";

/** Weeks shown in Trends (the last one is the current, partial week). */
export const TREND_WEEKS = 6;

export const insightQueries = {
	activity: (range: SummaryRange) =>
		queryOptions({
			queryKey: [...queryKeys.combined, "activity", range],
			queryFn: () => {
				const { from, to } = summaryRange(range, new Date());
				return fetchActivity(from, to);
			},
			staleTime: 5 * 60_000,
		}),

	metrics: () =>
		queryOptions({
			// One cache entry per day: past weeks don't change.
			queryKey: [...queryKeys.combined, "metrics", localDayKey(Date.now())],
			queryFn: () => {
				const now = new Date();
				return fetchMetrics(lastWeeks(TREND_WEEKS, now), now);
			},
			staleTime: 30 * 60_000,
			refetchInterval: false,
		}),
};
