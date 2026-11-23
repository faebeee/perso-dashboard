import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#/lib/query-keys";
import { fetchReleases } from "./server-fns";

export const releaseQueries = {
	all: () =>
		queryOptions({
			queryKey: queryKeys.releases,
			queryFn: () => fetchReleases(),
		}),
};
