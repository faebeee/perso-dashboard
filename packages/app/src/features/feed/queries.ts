import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#/lib/query-keys";
import { fetchFeed } from "./fetchers";

export const feedQueries = {
	all: () =>
		queryOptions({
			queryKey: queryKeys.feed,
			queryFn: () => fetchFeed(),
		}),
};
