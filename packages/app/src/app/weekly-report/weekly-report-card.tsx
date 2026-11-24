import { type SummaryRange, summaryRange } from "@dashboard/core/insights";
import { Button } from "@dashboard/ui/components/button";
import { cn } from "@dashboard/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { useMemo, useState } from "react";
import {
	AiSummaryActions,
	AiSummaryBody,
} from "#/features/ai-summary/components/ai-summary-parts";
import { useAiSummary } from "#/features/ai-summary/use-ai-summary";
import { insightQueries, TREND_WEEKS } from "#/features/insights/queries";
import { WEEKLY_SYSTEM_PROMPT, weeklyReportPrompt } from "./weekly-prompt";

type Week = Extract<SummaryRange, "this_week" | "last_week">;

const WEEKS: { range: Week; label: string; metricIndex: number }[] = [
	{ range: "last_week", label: "Last week", metricIndex: TREND_WEEKS - 2 },
	{ range: "this_week", label: "This week", metricIndex: TREND_WEEKS - 1 },
];

/**
 * An AI-written weekly status report from Insights' activity and numbers.
 * Stored like the daily summary: a finished week is written once.
 */
export function WeeklyReportCard() {
	const [range, setRange] = useState<Week>("last_week");
	const week = WEEKS.find((w) => w.range === range) ?? WEEKS[0];
	const period = useMemo(() => summaryRange(range, new Date()), [range]);
	const activity = useQuery(insightQueries.activity(range));
	const metrics = useQuery(insightQueries.metrics());
	const ready = Boolean(activity.data && metrics.data);

	const prompt = useMemo(
		() =>
			weeklyReportPrompt({
				title: period.title,
				from: period.from,
				activity: activity.data?.items ?? [],
				metrics: metrics.data?.items ?? [],
				weekIndex: week?.metricIndex ?? TREND_WEEKS - 2,
			}),
		[period, activity.data, metrics.data, week],
	);
	const state = useAiSummary({
		scope: `weekly|${period.from.toISOString().slice(0, 10)}`,
		system: WEEKLY_SYSTEM_PROMPT,
		prompt,
		enabled: ready,
	});

	return (
		<section
			aria-label="AI weekly report"
			className="rounded-xl border bg-card shadow-xs"
		>
			<header className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
				<FileText className="size-4 text-muted-foreground" />
				<h2 className="text-sm font-semibold">AI weekly report</h2>
				<span className="text-xs text-muted-foreground">
					For a 1:1 or a status mail
				</span>
				<div className="ml-auto flex flex-wrap items-center gap-2">
					<fieldset
						className="inline-flex rounded-lg border bg-muted/40 p-0.5"
						aria-label="Week"
					>
						{WEEKS.map((w) => (
							<Button
								key={w.range}
								size="sm"
								variant={range === w.range ? "secondary" : "ghost"}
								aria-pressed={range === w.range}
								className={cn(
									"h-7",
									range === w.range
										? "bg-background shadow-xs"
										: "text-muted-foreground",
								)}
								onClick={() => setRange(w.range)}
							>
								{w.label}
							</Button>
						))}
					</fieldset>
					<AiSummaryActions state={state} label="Write report" />
				</div>
			</header>
			<div className="px-4 py-3">
				<AiSummaryBody
					state={state}
					pitch="Let a language model write your weekly status report from Insights."
					intro="Writes a report from this week's activity (grouped by project) and your numbers, which are sent to the provider."
					changed="New activity since this report. Update it to include it."
				/>
			</div>
		</section>
	);
}
