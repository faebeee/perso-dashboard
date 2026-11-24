import { preferences } from "@dashboard/platform/preferences";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import { chosenLlm, type SummaryInput } from "./fetchers";
import { llmQueries, useSummarize } from "./queries";

/**
 * State and actions of one stored AI text (summary, report, prep). The
 * model is only asked on `summarize()`; an unchanged input shows the stored
 * text, a changed one the last text of its `scope`, marked outdated.
 */
export function useAiSummary(
	input: SummaryInput & {
		/** False while the input isn't final yet (data still loading). */
		enabled?: boolean;
	},
) {
	useSyncExternalStore(preferences.subscribe, preferences.get);
	const chosen = chosenLlm();
	const { scope, system, prompt, enabled = true } = input;
	const stored = useQuery({
		...llmQueries.summary({ scope, system, prompt }),
		enabled: Boolean(chosen) && enabled,
	});
	const mutation = useSummarize();

	const { cancel } = mutation;
	// biome-ignore lint/correctness/useExhaustiveDependencies: abort when the scope changes
	useEffect(() => cancel(), [scope]);

	const current = stored.data?.current ?? null;
	const shown = current ?? stored.data?.latest ?? null;
	return {
		chosen,
		current,
		shown,
		outdated: Boolean(shown && !current),
		/** The stored texts are still being looked up. */
		loading: stored.isPending && Boolean(chosen) && enabled,
		pending: mutation.isPending,
		error: mutation.error,
		canSummarize: Boolean(chosen) && enabled && !stored.isPending,
		summarize: () => mutation.mutate({ scope, system, prompt }),
		cancel,
	};
}

export type AiSummaryState = ReturnType<typeof useAiSummary>;
