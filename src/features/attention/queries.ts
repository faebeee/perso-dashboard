import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#/lib/query-keys";
import { fetchAttention } from "./fetchers";

export const attentionQueries = {
	all: () =>
		queryOptions({
			queryKey: queryKeys.attention,
			queryFn: () => fetchAttention(),
			// Meeting countdowns go stale fast.
			staleTime: 30_000,
			refetchInterval: 60_000,
		}),
};
