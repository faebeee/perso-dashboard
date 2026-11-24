import { Badge } from "@dashboard/ui/components/badge";
import { Sparkles } from "lucide-react";
import { createContext, type ReactNode, useContext } from "react";

/** A short note about a row's item, e.g. an AI triage result. */
export interface ItemInsight {
	/** One line: what it's about. */
	gist: string;
	/** Suggested next step, shown as a badge ("Reply", "Review"…). */
	action?: string;
	/** Why, shown on hover. */
	reason?: string;
}

const ItemInsightContext = createContext<ReadonlyMap<string, ItemInsight>>(
	new Map(),
);

/**
 * The app injects insights per item id (e.g. AI triage), so shared lists
 * show them without depending on the feature that produced them.
 */
export function ItemInsightProvider({
	insights,
	children,
}: {
	insights: ReadonlyMap<string, ItemInsight>;
	children: ReactNode;
}) {
	return (
		<ItemInsightContext.Provider value={insights}>
			{children}
		</ItemInsightContext.Provider>
	);
}

/** The insight of one row, if any. */
export function ItemInsightLine({ id }: { id: string }) {
	const insight = useContext(ItemInsightContext).get(id);
	if (!insight) return null;
	return (
		<div
			className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
			title={insight.reason}
		>
			<Sparkles className="size-3 shrink-0 text-primary" aria-label="AI" />
			{insight.action && (
				<Badge variant="outline" className="h-4 shrink-0 px-1.5 text-[10px]">
					{insight.action}
				</Badge>
			)}
			<span className="truncate">{insight.gist}</span>
		</div>
	);
}
