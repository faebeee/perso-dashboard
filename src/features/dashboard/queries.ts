import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#/lib/query-keys";
import { fetchDashboardLayout } from "./server-fns";

export const layoutQueries = {
	current: () =>
		queryOptions({
			queryKey: queryKeys.layout,
			queryFn: () => fetchDashboardLayout(),
			// The layout only changes through this client: never refetch it.
			staleTime: Number.POSITIVE_INFINITY,
			refetchInterval: false,
		}),
};
