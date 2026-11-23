import {
	type ActivityItem,
	lastWeeks,
	type MetricSeries,
	type SummaryRange,
	summaryRange,
	type WeekRange,
} from "@dashboard/core/insights";
import { Button } from "@dashboard/ui/components/button";
import { cn } from "@dashboard/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
	BarChart3,
	Check,
	ClipboardCopy,
	ListChecks,
	Table2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useItemClick } from "#/components/item-detail/item-detail-provider";
import { ItemIcon } from "#/components/source-kit/item-icon";
import { useSources } from "#/components/source-kit/source-context";
import { QueryState } from "#/components/widget-kit/query-state";
import { SourceErrors } from "#/components/widget-kit/source-errors";
import { insightQueries, TREND_WEEKS } from "../queries";
import {
	ACTIVITY_ITEM_KIND,
	compareWeeks,
	formatMetric,
	formatSummaryMarkdown,
	groupActivity,
} from "../summary";
import { MetricChart } from "./metric-chart";

export function InsightsPage() {
	return (
		<div className="space-y-6">
			<SummarySection />
			<TrendsSection />
		</div>
	);
}

const RANGES: { range: SummaryRange; label: string }[] = [
	{ range: "since_last_workday", label: "Since last workday" },
	{ range: "this_week", label: "This week" },
	{ range: "last_week", label: "Last week" },
];

function SummarySection() {
	const [range, setRange] = useState<SummaryRange>("since_last_workday");
	const query = useQuery(insightQueries.activity(range));
	const [copied, setCopied] = useState(false);
	const { title } = summaryRange(range, new Date());
	const groups = useMemo(
		() => groupActivity(query.data?.items ?? []),
		[query.data],
	);

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(formatSummaryMarkdown(title, groups));
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			// clipboard unavailable
		}
	};

	return (
		<section
			aria-label="Summary"
			className="rounded-xl border bg-card shadow-xs"
		>
			<header className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
				<ListChecks className="size-4 text-muted-foreground" />
				<h2 className="text-sm font-semibold">Summary</h2>
				<span className="text-xs text-muted-foreground">
					For your standup or weekly update
				</span>
				<div className="ml-auto flex flex-wrap items-center gap-2">
					<fieldset
						className="inline-flex rounded-lg border bg-muted/40 p-0.5"
						aria-label="Period"
					>
						{RANGES.map((r) => (
							<Button
								key={r.range}
								size="sm"
								variant={range === r.range ? "secondary" : "ghost"}
								aria-pressed={range === r.range}
								className={cn(
									"h-7",
									range === r.range
										? "bg-background shadow-xs"
										: "text-muted-foreground",
								)}
								onClick={() => setRange(r.range)}
							>
								{r.label}
							</Button>
						))}
					</fieldset>
					<Button
						size="sm"
						variant="outline"
						className="h-7"
						onClick={copy}
						disabled={!query.data}
					>
						{copied ? <Check /> : <ClipboardCopy />}
						{copied ? "Copied" : "Copy as Markdown"}
					</Button>
				</div>
			</header>
			<div className="px-4 py-3">
				<QueryState
					query={query}
					isEmpty={({ items }) => items.length === 0}
					emptyMessage="Nothing recorded for this period."
				>
					{({ errors }) => (
						<div className="space-y-4">
							<SourceErrors errors={errors} />
							<div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
								{groups.map((group) => (
									<div key={group.kind}>
										<h3 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
											{group.label} ({group.items.length})
										</h3>
										<ul className="space-y-0.5">
											{group.items
												.slice(0, group.countOnly ? 5 : 20)
												.map((item) => (
													<li key={item.id}>
														<ActivityRow item={item} />
													</li>
												))}
											{group.items.length > (group.countOnly ? 5 : 20) && (
												<li className="px-1 text-xs text-muted-foreground">
													+{group.items.length - (group.countOnly ? 5 : 20)}{" "}
													more
												</li>
											)}
										</ul>
									</div>
								))}
							</div>
						</div>
					)}
				</QueryState>
			</div>
		</section>
	);
}

function ActivityRow({ item }: { item: ActivityItem }) {
	const onClick = useItemClick(item);
	return (
		<a
			href={item.url}
			target="_blank"
			rel="noreferrer"
			onClick={onClick}
			className="flex items-center gap-2 rounded-md px-1 py-1 text-sm text-inherit no-underline hover:bg-accent/60"
		>
			<ItemIcon
				source={item.source}
				kind={ACTIVITY_ITEM_KIND[item.kind]}
				className="size-6"
			/>
			<span className="min-w-0 flex-1 truncate">{item.title}</span>
			{item.context && (
				<span className="max-w-[40%] shrink-0 truncate text-xs text-muted-foreground">
					{item.context}
				</span>
			)}
		</a>
	);
}

function TrendsSection() {
	const query = useQuery(insightQueries.metrics());
	const [view, setView] = useState<"chart" | "table">("chart");
	const weeks = useMemo(() => lastWeeks(TREND_WEEKS, new Date()), []);

	return (
		<section aria-label="Trends" className="space-y-3">
			<div className="flex flex-wrap items-center gap-2">
				<h2 className="text-sm font-semibold">Trends</h2>
				<span className="text-xs text-muted-foreground">
					Last {TREND_WEEKS} weeks · the current week is shown hatched, so far
				</span>
				<fieldset
					className="ml-auto inline-flex rounded-lg border bg-muted/40 p-0.5"
					aria-label="View"
				>
					{(
						[
							["chart", "Charts", BarChart3],
							["table", "Table", Table2],
						] as const
					).map(([value, label, Icon]) => (
						<Button
							key={value}
							size="sm"
							variant={view === value ? "secondary" : "ghost"}
							aria-pressed={view === value}
							className={cn(
								"h-7",
								view === value
									? "bg-background shadow-xs"
									: "text-muted-foreground",
							)}
							onClick={() => setView(value)}
						>
							<Icon /> {label}
						</Button>
					))}
				</fieldset>
			</div>
			<QueryState
				query={query}
				isEmpty={({ items }) => items.length === 0}
				emptyMessage="Connect GitHub, Jira, Gmail or Google Calendar to see trends."
			>
				{({ items, errors }) => (
					<div className="space-y-3">
						<SourceErrors errors={errors} />
						{view === "chart" ? (
							<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
								{items.map((series) => (
									<MetricCard key={series.id} series={series} weeks={weeks} />
								))}
							</div>
						) : (
							<TrendsTable items={items} weeks={weeks} />
						)}
					</div>
				)}
			</QueryState>
		</section>
	);
}

function MetricCard({
	series,
	weeks,
}: {
	series: MetricSeries;
	weeks: readonly WeekRange[];
}) {
	const sources = useSources();
	const source = sources[series.source];
	const SourceIcon = source?.icon;
	const { lastWeek, average, change, thisWeek } = compareWeeks(series.values);

	return (
		<article className="rounded-xl border bg-card p-4 shadow-xs">
			<header className="flex items-start gap-2">
				{SourceIcon && (
					<SourceIcon
						className="mt-0.5 size-4 shrink-0 text-muted-foreground"
						aria-label={source?.name}
					/>
				)}
				<div className="min-w-0 flex-1">
					<h3 className="truncate text-sm font-semibold">{series.label}</h3>
					<p
						className="truncate text-xs text-muted-foreground"
						title={series.description}
					>
						{series.description}
					</p>
				</div>
			</header>
			<p className="mt-3 text-xs text-muted-foreground">
				<span className="font-display text-base font-semibold text-foreground tabular-nums">
					{formatMetric(lastWeek, series)}
				</span>{" "}
				last week
				{average !== null && (
					<>
						{" · "}
						{change !== null && Math.abs(change) >= 0.05
							? `${change > 0 ? "↑" : "↓"} ${Math.round(Math.abs(change) * 100)}% vs avg ${formatMetric(average, series)}`
							: `about the usual (${formatMetric(average, series)})`}
					</>
				)}
				{" · "}
				{formatMetric(thisWeek, series)} so far
			</p>
			<div className="mt-6">
				<MetricChart series={series} weeks={weeks} />
			</div>
		</article>
	);
}

function TrendsTable({
	items,
	weeks,
}: {
	items: MetricSeries[];
	weeks: readonly WeekRange[];
}) {
	const sources = useSources();
	const label = new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
	});
	return (
		<div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
			<table className="w-full text-sm">
				<caption className="sr-only">Weekly trends</caption>
				<thead>
					<tr className="border-b text-xs text-muted-foreground">
						<th scope="col" className="px-3 py-2 text-left font-medium">
							Metric
						</th>
						{weeks.map((w, i) => (
							<th
								key={w.start.getTime()}
								scope="col"
								className="px-3 py-2 text-right font-medium"
							>
								{i === weeks.length - 1
									? "This week (so far)"
									: `Week of ${label.format(w.start)}`}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{items.map((series) => (
						<tr key={series.id} className="border-b last:border-0">
							<th scope="row" className="px-3 py-2 text-left font-medium">
								{series.label}
								<span className="ml-1 text-xs font-normal text-muted-foreground">
									{sources[series.source]?.name ?? series.source}
								</span>
							</th>
							{series.values.map((value, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: one cell per week
								<td key={i} className="px-3 py-2 text-right tabular-nums">
									{formatMetric(value, series)}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
