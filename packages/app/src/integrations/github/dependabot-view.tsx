import { cn } from "@dashboard/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { QueryState } from "#/components/widget-kit/query-state";
import { WorkItemList } from "#/components/work-item/work-item-list";
import {
	type DependabotResult,
	SEVERITIES,
	SEVERITY_LABELS,
} from "./dependabot";
import { githubQueries } from "./queries";

const SEVERITY_STYLE: Record<(typeof SEVERITIES)[number], string> = {
	critical: "border-destructive/40 text-destructive",
	high: "border-orange-500/40 text-orange-600 dark:text-orange-400",
	medium: "border-amber-500/40 text-amber-600 dark:text-amber-400",
	low: "text-muted-foreground",
};

/** Counts per severity, then the alerts (most severe, oldest first). */
export function DependabotAlerts({
	result,
	limit,
}: {
	result: DependabotResult;
	limit?: number;
}) {
	const counts = SEVERITIES.map((severity) => ({
		severity,
		count: result.items.filter((i) => i.status === SEVERITY_LABELS[severity])
			.length,
	}));
	return (
		<div className="space-y-2 py-1">
			<div className="flex flex-wrap gap-1.5">
				{counts.map(({ severity, count }) => (
					<span
						key={severity}
						className={cn(
							"inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs tabular-nums",
							count > 0
								? SEVERITY_STYLE[severity]
								: "text-muted-foreground opacity-60",
						)}
					>
						{SEVERITY_LABELS[severity]}{" "}
						<span className="font-semibold">{count}</span>
					</span>
				))}
			</div>
			{result.items.length === 0 ? (
				<p className="py-6 text-center text-sm text-muted-foreground">
					No open Dependabot alerts. 🎉
				</p>
			) : (
				<WorkItemList
					items={limit ? result.items.slice(0, limit) : result.items}
				/>
			)}
			<p className="px-1 text-xs text-muted-foreground">
				Checked {result.checkedRepos} repositor
				{result.checkedRepos === 1 ? "y" : "ies"} you can write to
				{result.skippedRepos > 0 &&
					` · ${result.skippedRepos} skipped (Dependabot off or alerts not visible to you)`}
				.
			</p>
		</div>
	);
}

/** Dashboard widget body. */
export function DependabotWidget() {
	const query = useQuery(githubQueries.dependabotAlerts());
	return (
		<QueryState query={query}>
			{(result) => <DependabotAlerts result={result} limit={25} />}
		</QueryState>
	);
}
