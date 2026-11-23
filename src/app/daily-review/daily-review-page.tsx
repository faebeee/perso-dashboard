import { useQuery } from "@tanstack/react-query";
import {
	Ban,
	Check,
	ClipboardCopy,
	History,
	ListChecks,
	NotebookPen,
	StickyNote,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useItemClick } from "#/components/item-detail/item-detail-provider";
import { ItemIcon } from "#/components/source-kit/item-icon";
import { useSources } from "#/components/source-kit/source-context";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { QueryState } from "#/components/widget-kit/query-state";
import { SourceErrors } from "#/components/widget-kit/source-errors";
import { type SummaryRange, summaryRange } from "#/core/insights";
import { insightQueries } from "#/features/insights/queries";
import { ACTIVITY_ITEM_KIND } from "#/features/insights/summary";
import { todayQueries } from "#/features/today/queries";
import { waitingQueries } from "#/features/waiting/queries";
import { formatStandup, type StandupFormat } from "#/lib/standup";
import { localDayKey } from "#/lib/time";
import { cn } from "#/lib/utils";
import {
	buildDailyReview,
	collectProjects,
	type ReviewFilter,
	type ReviewProject,
	scopeHeading,
	type TimelineEntry,
} from "./build-review";

const RANGES: { range: SummaryRange; label: string }[] = [
	{ range: "since_last_workday", label: "Since last workday" },
	{ range: "last_24_hours", label: "Last 24 hours" },
];

const FORMATS: { format: StandupFormat; label: string }[] = [
	{ format: "markdown", label: "Markdown" },
	{ format: "slack", label: "Slack" },
	{ format: "plain", label: "Plain text" },
];

const time = new Intl.DateTimeFormat(undefined, {
	hour: "2-digit",
	minute: "2-digit",
});

/**
 * Daily review for standups: what you did since your last workday, what's
 * planned today, what blocks you, and a copy-ready standup text. Composes
 * the Insights, Today and Waiting features (hence it lives in `app/`).
 */
export function DailyReviewPage() {
	const [range, setRange] = useState<SummaryRange>("since_last_workday");
	const [format, setFormat] = useState<StandupFormat>(() => {
		try {
			return (
				(localStorage.getItem("review.format") as StandupFormat) || "markdown"
			);
		} catch {
			return "markdown";
		}
	});
	// Fixed per range so the query key stays stable while the page is open.
	const period = useMemo(() => summaryRange(range, new Date()), [range]);

	const activity = useQuery(insightQueries.activity(range));
	const completed = useQuery(todayQueries.completedSince(period.from));
	const todayList = useQuery(todayQueries.list());
	const agenda = useQuery(todayQueries.agenda());
	const waiting = useQuery(waitingQueries.all());
	const [notes, setNotes] = useNotes();
	const [copied, setCopied] = useState(false);

	const [filter, setFilter] = useReviewFilter();
	const input = useMemo(
		() => ({
			activity: activity.data?.items ?? [],
			completed: completed.data ?? [],
			openToday: (todayList.data ?? []).filter((t) => !t.done),
			agenda: agenda.data?.items ?? [],
			waiting: waiting.data?.items ?? [],
			now: new Date(),
		}),
		[activity.data, completed.data, todayList.data, agenda.data, waiting.data],
	);
	// From everything in the period, so chips don't vanish while filtering.
	const projects = useMemo(() => collectProjects(input), [input]);
	const review = useMemo(
		() => buildDailyReview({ ...input, filter }),
		[input, filter],
	);

	const noteLines = notes
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
	const heading = scopeHeading(filter);
	const standup = [
		heading,
		formatStandup(
			[
				review.done,
				review.today,
				review.blockers,
				...(noteLines.length > 0 ? [{ title: "Notes", lines: noteLines }] : []),
			],
			format,
		),
	]
		.filter(Boolean)
		.join("\n\n");

	const chooseFormat = (next: StandupFormat) => {
		setFormat(next);
		try {
			localStorage.setItem("review.format", next);
		} catch {
			// remembered for this session only
		}
	};

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(standup);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			// clipboard unavailable: the preview is selectable
		}
	};

	const stillLoading = [activity, waiting, todayList].some((q) => q.isPending);

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center gap-2">
				<Segmented
					label="Period"
					options={RANGES.map((r) => ({ value: r.range, label: r.label }))}
					value={range}
					onChange={setRange}
				/>
				<span className="text-xs text-muted-foreground">
					{period.title} · since{" "}
					{period.from.toLocaleString(undefined, {
						weekday: "short",
						hour: "2-digit",
						minute: "2-digit",
					})}
				</span>
			</div>

			<ProjectFilter projects={projects} filter={filter} onChange={setFilter} />

			<div className="grid items-start gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
				<Card title="What you did" icon={History}>
					<QueryState
						query={activity}
						isEmpty={() => review.timeline.length === 0}
						emptyMessage={
							filter.projects.length > 0
								? "Nothing for the selected projects in this period."
								: "Nothing recorded for this period yet."
						}
					>
						{({ errors }) => (
							<div className="space-y-4">
								<SourceErrors errors={errors} />
								{review.timeline.map((day) => (
									<section key={day.day} aria-label={day.label}>
										<h3 className="sticky top-0 z-10 bg-card py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
											{day.label}
											<span className="ml-2 font-normal normal-case">
												{day.entries.length}{" "}
												{day.entries.length === 1 ? "thing" : "things"}
											</span>
										</h3>
										<ol className="space-y-0.5">
											{day.entries.map((entry) => (
												<li key={entry.id}>
													<TimelineRow entry={entry} />
												</li>
											))}
										</ol>
									</section>
								))}
							</div>
						)}
					</QueryState>
				</Card>

				<div className="grid gap-4">
					<Card title="Today" icon={ListChecks}>
						<SectionLines
							lines={review.today.lines}
							empty="Nothing planned. Pin items or add notes on Today."
						/>
					</Card>
					<Card title="Blockers" icon={Ban}>
						<SectionLines
							lines={review.blockers.lines}
							empty="Nothing is waiting on other people."
						/>
					</Card>
					<Card title="Notes" icon={StickyNote}>
						<label htmlFor="review-notes" className="sr-only">
							Notes for today's standup
						</label>
						<textarea
							id="review-notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={3}
							placeholder="Anything else to mention? One point per line."
							className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
						/>
					</Card>
					<Card
						title="Standup"
						icon={NotebookPen}
						action={
							<div className="flex items-center gap-2">
								<Segmented
									label="Format"
									options={FORMATS.map((f) => ({
										value: f.format,
										label: f.label,
									}))}
									value={format}
									onChange={chooseFormat}
								/>
								<Button
									size="sm"
									className="h-7"
									onClick={copy}
									disabled={stillLoading}
								>
									{copied ? <Check /> : <ClipboardCopy />}
									{copied ? "Copied" : "Copy"}
								</Button>
							</div>
						}
					>
						<pre className="max-h-80 overflow-auto rounded-md bg-muted/50 p-3 font-mono text-xs whitespace-pre-wrap select-all">
							{stillLoading ? "Collecting…" : standup}
						</pre>
					</Card>
				</div>
			</div>
		</div>
	);
}

/** Notes are a per-day draft on this device (a fresh page each morning). */
function useNotes(): [string, (value: string) => void] {
	const key = `review.notes.${localDayKey(Date.now())}`;
	const [notes, setNotes] = useState(() => {
		try {
			return localStorage.getItem(key) ?? "";
		} catch {
			return "";
		}
	});
	const update = (value: string) => {
		setNotes(value);
		try {
			localStorage.setItem(key, value);
		} catch {
			// kept in memory only
		}
	};
	return [notes, update];
}

function TimelineRow({ entry }: { entry: TimelineEntry }) {
	const onClick = useItemClick({
		source: entry.source ?? "",
		title: entry.title,
		url: entry.url ?? "",
		detailRef: entry.detailRef,
	});
	const kind =
		entry.kind === "today_done" ? undefined : ACTIVITY_ITEM_KIND[entry.kind];
	const Content = (
		<>
			<span className="w-12 shrink-0 text-xs text-muted-foreground tabular-nums">
				{time.format(entry.at)}
			</span>
			{kind && entry.source ? (
				<ItemIcon source={entry.source} kind={kind} className="size-6" />
			) : (
				<span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
					<Check className="size-3.5" />
				</span>
			)}
			<Badge variant="secondary" className="shrink-0">
				{entry.label}
			</Badge>
			<span className="min-w-0 flex-1 truncate">{entry.title}</span>
			{entry.context && (
				<span className="hidden max-w-[35%] shrink-0 truncate text-xs text-muted-foreground sm:inline">
					{entry.context}
				</span>
			)}
		</>
	);
	const rowClass = "flex items-center gap-2 rounded-md px-1 py-1 text-sm";
	return entry.url ? (
		<a
			href={entry.url}
			target="_blank"
			rel="noreferrer"
			onClick={onClick}
			className={cn(rowClass, "text-inherit no-underline hover:bg-accent/60")}
		>
			{Content}
		</a>
	) : (
		<div className={rowClass}>{Content}</div>
	);
}

function SectionLines({ lines, empty }: { lines: string[]; empty: string }) {
	if (lines.length === 0) {
		return <p className="text-sm text-muted-foreground">{empty}</p>;
	}
	return (
		<ul className="list-disc space-y-1 pl-5 text-sm">
			{lines.map((line, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: lines can repeat
				<li key={i}>{line}</li>
			))}
		</ul>
	);
}

function Card({
	title,
	icon: Icon,
	action,
	children,
}: {
	title: string;
	icon: React.ComponentType<{ className?: string }>;
	action?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<section aria-label={title} className="rounded-xl border bg-card shadow-xs">
			<header className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
				<Icon className="size-4 text-muted-foreground" />
				<h2 className="flex-1 text-sm font-semibold">{title}</h2>
				{action}
			</header>
			<div className="px-4 py-3">{children}</div>
		</section>
	);
}

function Segmented<T extends string>({
	label,
	options,
	value,
	onChange,
}: {
	label: string;
	options: { value: T; label: string }[];
	value: T;
	onChange: (value: T) => void;
}) {
	return (
		<fieldset
			className="inline-flex rounded-lg border bg-muted/40 p-0.5"
			aria-label={label}
		>
			{options.map((option) => (
				<Button
					key={option.value}
					size="sm"
					variant={value === option.value ? "secondary" : "ghost"}
					aria-pressed={value === option.value}
					className={cn(
						"h-7",
						value === option.value
							? "bg-background shadow-xs"
							: "text-muted-foreground",
					)}
					onClick={() => onChange(option.value)}
				>
					{option.label}
				</Button>
			))}
		</fieldset>
	);
}

const FILTER_KEY = "review.filter";
const NO_FILTER: ReviewFilter = { projects: [], includeUnscoped: false };

/** The project filter, remembered on this device ("what I currently need"). */
function useReviewFilter(): [ReviewFilter, (filter: ReviewFilter) => void] {
	const [filter, setFilter] = useState<ReviewFilter>(() => {
		try {
			const stored = JSON.parse(localStorage.getItem(FILTER_KEY) ?? "null");
			if (
				stored &&
				Array.isArray(stored.projects) &&
				stored.projects.every((p: unknown) => typeof p === "string")
			) {
				return {
					projects: stored.projects,
					includeUnscoped: Boolean(stored.includeUnscoped),
				};
			}
		} catch {
			// fall through
		}
		return NO_FILTER;
	});
	const update = (next: ReviewFilter) => {
		setFilter(next);
		try {
			localStorage.setItem(FILTER_KEY, JSON.stringify(next));
		} catch {
			// kept for this session only
		}
	};
	return [filter, update];
}

function ProjectFilter({
	projects,
	filter,
	onChange,
}: {
	projects: ReviewProject[];
	filter: ReviewFilter;
	onChange: (filter: ReviewFilter) => void;
}) {
	const sources = useSources();
	const active = filter.projects.length > 0;
	// Keep chosen projects visible even on a day without anything in them.
	const shown: ReviewProject[] = [
		...projects,
		...filter.projects
			.filter((name) => !projects.some((p) => p.name === name))
			.map((name) => ({ name, count: 0, sources: [] })),
	];
	if (shown.length === 0) return null;

	const toggle = (name: string) =>
		onChange({
			...filter,
			projects: filter.projects.includes(name)
				? filter.projects.filter((p) => p !== name)
				: [...filter.projects, name],
		});

	return (
		<div
			className="flex flex-wrap items-center gap-2"
			role="toolbar"
			aria-label="Filter by project"
		>
			<FilterChip
				pressed={!active}
				onClick={() => onChange({ ...filter, projects: [] })}
			>
				All projects
			</FilterChip>
			{shown.map((project) => (
				<FilterChip
					key={project.name}
					pressed={filter.projects.includes(project.name)}
					onClick={() => toggle(project.name)}
				>
					{project.sources.map((id) => {
						const Icon = sources[id]?.icon;
						return Icon ? (
							<Icon key={id} aria-label={sources[id]?.name} />
						) : null;
					})}
					{project.name}
					<span className="text-muted-foreground">{project.count}</span>
				</FilterChip>
			))}
			{active && (
				<label className="ml-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
					<input
						type="checkbox"
						className="size-3.5 accent-primary"
						checked={filter.includeUnscoped}
						onChange={(e) =>
							onChange({ ...filter, includeUnscoped: e.target.checked })
						}
					/>
					Also show meetings, mail and notes
				</label>
			)}
		</div>
	);
}

function FilterChip({
	pressed,
	onClick,
	children,
}: {
	pressed: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<Button
			size="sm"
			variant={pressed ? "secondary" : "outline"}
			aria-pressed={pressed}
			className="h-7 rounded-full"
			onClick={onClick}
		>
			{children}
		</Button>
	);
}
