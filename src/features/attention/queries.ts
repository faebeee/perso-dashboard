import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";
import type { AttentionItem } from "#/core/attention";
import { applyDismissals, type DismissedItem } from "#/core/dismissal";
import type { IntegrationError } from "#/core/result";
import { queryKeys } from "#/lib/query-keys";
import type { AttentionResult } from "./aggregate";
import {
	dismissItem,
	fetchAttention,
	fetchDismissals,
	restoreItem,
} from "./fetchers";

export const attentionQueries = {
	/** Raw provider data (everything urgent, before done/snoozed filtering). */
	all: () =>
		queryOptions({
			queryKey: queryKeys.attention,
			queryFn: () => fetchAttention(),
			// Meeting countdowns go stale fast.
			staleTime: 30_000,
			refetchInterval: 60_000,
			// Keep the tray, badge and notifications live while the window is hidden.
			refetchIntervalInBackground: true,
		}),

	dismissals: () =>
		queryOptions({
			queryKey: queryKeys.dismissals,
			queryFn: () => fetchDismissals(),
			// Re-check every minute so snoozes end on time.
			refetchInterval: 60_000,
			refetchIntervalInBackground: true,
		}),
};

export interface AttentionState {
	/** What's still urgent (done and snoozed items removed), ranked. */
	items: AttentionItem[];
	/** Done or snoozed, newest dismissal last. */
	hidden: DismissedItem[];
	errors: IntegrationError[];
}

/**
 * The urgent list as everyone should see it: provider data minus what you
 * cleared. Used by the Urgent view, badge, tray, notifications and ⌘K.
 */
export function useAttention() {
	const { data: dismissals } = useQuery(attentionQueries.dismissals());
	const select = useCallback(
		(raw: AttentionResult): AttentionState => {
			const { visible, hidden } = applyDismissals(
				raw.items,
				dismissals ?? [],
				new Date(),
			);
			return { items: visible, hidden, errors: raw.errors };
		},
		[dismissals],
	);
	return useQuery({ ...attentionQueries.all(), select });
}

export function useDismissItem() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			item,
			until,
		}: {
			item: AttentionItem;
			until: Date | null;
		}) => dismissItem(item, until),
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: queryKeys.dismissals }),
	});
}

export function useRestoreItem() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (itemId: string) => restoreItem(itemId),
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: queryKeys.dismissals }),
	});
}
