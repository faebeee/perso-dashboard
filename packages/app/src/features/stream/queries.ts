import {
	queryOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "#/lib/query-keys";
import {
	dismissStreamEvents,
	fetchStreamDismissals,
	restoreStreamEvents,
} from "./fetchers";

export const streamQueries = {
	/** Ids of cleared entries: local state, never refetched on a timer. */
	dismissals: () =>
		queryOptions({
			queryKey: queryKeys.streamDismissals,
			queryFn: () => fetchStreamDismissals(),
			staleTime: Number.POSITIVE_INFINITY,
			refetchInterval: false,
		}),
};

/**
 * Clears (or, with `restore`, brings back) entries. The list updates at
 * once; on failure it rolls back.
 */
function useChangeDismissals(restore: boolean) {
	const queryClient = useQueryClient();
	const key = queryKeys.streamDismissals;
	return useMutation({
		mutationFn: (ids: readonly string[]) =>
			restore ? restoreStreamEvents(ids) : dismissStreamEvents(ids),
		onMutate: async (ids) => {
			await queryClient.cancelQueries({ queryKey: key });
			const before = queryClient.getQueryData<string[]>(key);
			const changed = new Set(ids);
			queryClient.setQueryData<string[]>(key, (current = []) =>
				restore
					? current.filter((id) => !changed.has(id))
					: [...new Set([...current, ...ids])],
			);
			return { before };
		},
		onError: (_error, _ids, context) =>
			queryClient.setQueryData(key, context?.before),
		onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
	});
}

export const useDismissStreamEvents = () => useChangeDismissals(false);
export const useRestoreStreamEvents = () => useChangeDismissals(true);
