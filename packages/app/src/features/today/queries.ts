import type { NewTodayItem } from "@dashboard/core/today";
import {
	queryOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "#/lib/query-keys";
import { localDayKey } from "#/lib/time";
import {
	addToToday,
	fetchAgenda,
	fetchCompletedSince,
	fetchToday,
	removeFromToday,
	setTodayDone,
} from "./fetchers";

export const todayQueries = {
	/** Provider data: refreshed with the other integrations. */
	agenda: (day: Date = new Date()) =>
		queryOptions({
			queryKey: [...queryKeys.combined, "agenda", localDayKey(day.getTime())],
			queryFn: () => fetchAgenda(day),
		}),

	list: () =>
		queryOptions({
			queryKey: queryKeys.today,
			queryFn: () => fetchToday(),
			// Local data: only changes through these mutations (or at midnight).
			staleTime: 60_000,
			refetchInterval: 10 * 60_000,
		}),

	completedSince: (since: Date) =>
		queryOptions({
			// Under "today" so ticking items off refreshes it too.
			queryKey: [...queryKeys.today, "completed", since.getTime()],
			queryFn: () => fetchCompletedSince(since),
		}),
};

function useTodayMutation<T>(fn: (input: T) => Promise<unknown>) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: fn,
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: queryKeys.today }),
	});
}

export const useAddToToday = () =>
	useTodayMutation((item: NewTodayItem) => addToToday(item));

export const useSetTodayDone = () =>
	useTodayMutation(({ id, done }: { id: string; done: boolean }) =>
		setTodayDone(id, done),
	);

export const useRemoveFromToday = () =>
	useTodayMutation((id: string) => removeFromToday(id));
