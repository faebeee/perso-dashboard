import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { DashboardLayout } from "#/core/layout";
import type { WidgetDefinition } from "#/core/widget";
import { queryKeys } from "#/lib/query-keys";
import { saveDashboardLayout } from "./fetchers";
import { buildDefaultLayout } from "./model";
import { layoutQueries } from "./queries";

const SAVE_DEBOUNCE_MS = 600;

/**
 * Layout state with optimistic updates and debounced persistence.
 * Falls back to a generated default when nothing has been saved yet.
 */
export function useDashboardLayout(catalog: readonly WidgetDefinition[]) {
	const queryClient = useQueryClient();
	const { data: saved } = useSuspenseQuery(layoutQueries.current());
	const fallback = useMemo(() => buildDefaultLayout(catalog), [catalog]);
	const layout = saved ?? fallback;

	const save = useMutation({
		mutationFn: (next: DashboardLayout) => saveDashboardLayout(next),
	});

	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const pending = useRef<DashboardLayout | undefined>(undefined);

	const flush = useCallback(() => {
		clearTimeout(timer.current);
		if (pending.current) {
			save.mutate(pending.current);
			pending.current = undefined;
		}
	}, [save.mutate]);

	const setLayout = useCallback(
		(next: DashboardLayout) => {
			queryClient.setQueryData(queryKeys.layout, next);
			pending.current = next;
			clearTimeout(timer.current);
			timer.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
		},
		[queryClient, flush],
	);

	// Don't lose the last change when navigating away mid-debounce.
	useEffect(() => flush, [flush]);

	return {
		layout,
		setLayout,
		isSaving: save.isPending,
		saveError: save.error,
	};
}
