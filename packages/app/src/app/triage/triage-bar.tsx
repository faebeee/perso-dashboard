import type { AttentionItem } from "@dashboard/core/attention";
import type { WorkItem } from "@dashboard/core/work-item";
import { preferences } from "@dashboard/platform/preferences";
import { Button } from "@dashboard/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Loader2, Sparkles, X } from "lucide-react";
import { type ReactNode, useMemo, useSyncExternalStore } from "react";
import {
	type ItemInsight,
	ItemInsightProvider,
} from "#/components/item-insight/item-insight";
import { chosenLlm } from "#/features/ai-summary/fetchers";
import { llmQueries, useRunTriage } from "#/features/ai-summary/queries";
import type { TriageItem, TriageResult } from "#/features/ai-summary/triage";

const ACTION_LABELS: Record<TriageResult["action"], string> = {
	reply: "Reply",
	review: "Review",
	fix: "Fix",
	decide: "Decide",
	delegate: "Delegate",
	later: "Later",
	ignore: "Ignore",
};

/** Pure: an Urgent item for triage. Meetings aren't triaged. */
export function attentionToTriage(item: AttentionItem): TriageItem | null {
	if (item.reason === "meeting" || item.reason === "invitation") return null;
	return {
		id: item.id,
		source: item.source,
		kind: item.reason,
		title: item.title,
		context: item.context,
		from: item.actor?.name,
		// The urgency, not the label: "Waiting 2 days" changes daily and would
		// make every result look new.
		label: item.urgency,
		version: item.at,
	};
}

/** Pure: a My Work item for triage. */
export function workItemToTriage(item: WorkItem): TriageItem {
	return {
		id: item.id,
		source: item.source,
		kind: item.kind,
		title: item.title,
		context: item.context,
		status: item.status,
		tags: item.tags,
		from: item.actor?.name,
		version: item.updatedAt,
	};
}

/**
 * "Triage with AI" above a list: a gist and a next step per row. Stored
 * results show right away; the button only sends new or changed items.
 */
export function TriageBar({
	items,
	children,
}: {
	items: readonly TriageItem[] | undefined;
	children: ReactNode;
}) {
	useSyncExternalStore(preferences.subscribe, preferences.get);
	const chosen = chosenLlm();
	const list = items ?? [];
	const stored = useQuery({
		...llmQueries.triage(list),
		enabled: Boolean(chosen) && items !== undefined,
	});
	const run = useRunTriage();

	const insights = useMemo(() => {
		const map = new Map<string, ItemInsight>();
		for (const [id, r] of stored.data ?? [])
			map.set(id, {
				gist: r.gist,
				action: ACTION_LABELS[r.action],
				reason: r.reason,
			});
		return map;
	}, [stored.data]);
	const open = list.filter((item) => !insights.has(item.id)).length;

	return (
		<ItemInsightProvider insights={insights}>
			{items && items.length > 0 && (
				<div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
					<Sparkles className="size-3.5 text-primary" />
					{!chosen ? (
						<span>
							AI triage: a gist and a next step per item.{" "}
							<Link to="/settings/preferences" className="underline">
								Choose a provider in Preferences
							</Link>
							.
						</span>
					) : run.isPending ? (
						<>
							<Loader2 className="size-3.5 animate-spin" />
							<span className="flex-1">
								Triaging {open} item{open === 1 ? "" : "s"} with{" "}
								{chosen.provider.label}…
							</span>
							<Button
								size="sm"
								variant="ghost"
								className="h-6"
								onClick={run.cancel}
							>
								<X />
								Cancel
							</Button>
						</>
					) : (
						<>
							<span className="flex-1">
								{run.error ? (
									<span className="text-destructive">{run.error.message}</span>
								) : open === 0 ? (
									`All ${list.length} items triaged with ${chosen.provider.label}. Changed items show up as new.`
								) : (
									`${list.length - open} of ${list.length} triaged. Title, sender and status of ${open} item${open === 1 ? "" : "s"} would be sent to ${chosen.provider.label}.`
								)}
							</span>
							{open > 0 && (
								<Button
									size="sm"
									variant="outline"
									className="h-6"
									disabled={stored.isPending}
									onClick={() =>
										run.mutate(list.filter((item) => !insights.has(item.id)))
									}
								>
									Triage {open === list.length ? "with AI" : `${open} new`}
								</Button>
							)}
						</>
					)}
				</div>
			)}
			{children}
		</ItemInsightProvider>
	);
}
