import {
	queryOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
	chosenLlm,
	complete,
	deleteLlmKey,
	listSavedLlmKeys,
	loadSummary,
	type SummaryInput,
	type SummaryLookup,
	saveLlmKey,
	summarize,
} from "./fetchers";
import { fingerprint, loadTriage, runTriage, type TriageItem } from "./triage";

const keys = {
	savedKeys: ["llm", "saved-keys"] as const,
	summaries: ["ai-summary"] as const,
	triage: ["ai-triage"] as const,
};

/** Includes provider and model: switching either looks up other summaries. */
const summaryQueryKey = (input: SummaryInput) => {
	const chosen = chosenLlm();
	return [
		...keys.summaries,
		chosen?.provider.id ?? null,
		chosen?.model ?? null,
		input.scope,
		input.system,
		input.prompt,
	] as const;
};

export const llmQueries = {
	/** Stored triage of these items (local database only). */
	triage: (items: readonly TriageItem[]) => {
		const chosen = chosenLlm();
		return queryOptions({
			queryKey: [
				...keys.triage,
				chosen?.provider.id ?? null,
				chosen?.model ?? null,
				items.map(fingerprint),
			],
			queryFn: () => loadTriage(items),
			staleTime: Number.POSITIVE_INFINITY,
			refetchInterval: false,
		});
	},

	/** Stored summaries of this review (local database only). */
	summary: (input: SummaryInput) =>
		queryOptions({
			queryKey: summaryQueryKey(input),
			queryFn: () => loadSummary(input),
			staleTime: Number.POSITIVE_INFINITY,
			refetchInterval: false,
		}),

	/** Provider ids with a stored API key. */
	savedKeys: () =>
		queryOptions({
			queryKey: keys.savedKeys,
			queryFn: listSavedLlmKeys,
			staleTime: Number.POSITIVE_INFINITY,
			refetchInterval: false,
		}),
};

export function useSaveLlmKey() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			providerId,
			apiKey,
		}: {
			providerId: string;
			apiKey: string;
		}) => saveLlmKey(providerId, apiKey),
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: keys.savedKeys }),
	});
}

export function useDeleteLlmKey() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: deleteLlmKey,
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: keys.savedKeys }),
	});
}

/**
 * A completion that can be cancelled: starting a new one, `cancel()` or
 * unmounting aborts the one in flight.
 */
export function useCompletion() {
	const controller = useRef<AbortController | null>(null);
	const mutation = useMutation({
		mutationFn: (input: {
			system: string;
			prompt: string;
			providerId?: string;
		}) => {
			controller.current?.abort();
			const next = new AbortController();
			controller.current = next;
			return complete({ ...input, signal: next.signal });
		},
	});
	useEffect(() => () => controller.current?.abort(), []);
	const { reset } = mutation;
	return {
		...mutation,
		cancel: () => {
			controller.current?.abort();
			reset();
		},
	};
}

/**
 * Summarizes a review: reuses the stored summary when the content is
 * unchanged, otherwise asks the model. Cancellable like `useCompletion`.
 */
export function useSummarize() {
	const queryClient = useQueryClient();
	const controller = useRef<AbortController | null>(null);
	const mutation = useMutation({
		mutationFn: (input: SummaryInput) => {
			controller.current?.abort();
			const next = new AbortController();
			controller.current = next;
			return summarize({ ...input, signal: next.signal });
		},
		onSuccess: (stored, input) => {
			queryClient.setQueryData<SummaryLookup>(summaryQueryKey(input), {
				current: stored,
				latest: stored,
			});
			// Other scopes' "latest" may now point at an older summary.
			void queryClient.invalidateQueries({
				queryKey: keys.summaries,
				predicate: (query) =>
					query.queryKey.join("|") !== summaryQueryKey(input).join("|"),
			});
		},
	});
	useEffect(() => () => controller.current?.abort(), []);
	const { reset } = mutation;
	return {
		...mutation,
		cancel: () => {
			controller.current?.abort();
			reset();
		},
	};
}

/** Triages the items without a stored result; cancellable. */
export function useRunTriage() {
	const queryClient = useQueryClient();
	const controller = useRef<AbortController | null>(null);
	const mutation = useMutation({
		mutationFn: (items: readonly TriageItem[]) => {
			controller.current?.abort();
			const next = new AbortController();
			controller.current = next;
			return runTriage(items, next.signal);
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: keys.triage }),
	});
	useEffect(() => () => controller.current?.abort(), []);
	const { reset } = mutation;
	return {
		...mutation,
		cancel: () => {
			controller.current?.abort();
			reset();
		},
	};
}
