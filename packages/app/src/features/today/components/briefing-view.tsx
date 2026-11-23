import type { AttentionItem } from "@dashboard/core/attention";
import type { CalendarEvent } from "@dashboard/core/calendar-event";
import { minutesOfDay, preferences } from "@dashboard/platform/preferences";
import { Button } from "@dashboard/ui/components/button";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { cn } from "@dashboard/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
	CalendarClock,
	CircleAlert,
	Coffee,
	Hourglass,
	UserRoundCheck,
	Video,
} from "lucide-react";
import { type ReactNode, useSyncExternalStore } from "react";
import { useItemClick } from "#/components/item-detail/item-detail-provider";
import { ItemIcon } from "#/components/source-kit/item-icon";
import { QueryState } from "#/components/widget-kit/query-state";
import { SourceErrors } from "#/components/widget-kit/source-errors";
import { formatDuration } from "#/lib/time";
import { type Briefing, buildBriefing, workdayOn } from "../briefing";
import type { TimeBlock } from "../free-time";
import { todayQueries } from "../queries";

const time = new Intl.DateTimeFormat(undefined, {
	hour: "2-digit",
	minute: "2-digit",
});
const span = (start: Date | string, end: Date | string) =>
	`${time.format(new Date(start))}–${time.format(new Date(end))}`;

interface BriefingViewProps {
	/** Urgent items (already filtered); undefined while loading. */
	urgent: AttentionItem[] | undefined;
	/** Shown next to the timeline (the app puts your list and urgent items here). */
	children?: ReactNode;
}

/** Morning briefing: headline numbers plus your day as a timeline. */
export function BriefingView({ urgent, children }: BriefingViewProps) {
	const agenda = useQuery(todayQueries.agenda());
	const prefs = useSyncExternalStore(preferences.subscribe, preferences.get);
	const now = new Date();
	const workday = workdayOn(
		now,
		minutesOfDay(prefs.workdayStart),
		minutesOfDay(prefs.workdayEnd),
	);
	const briefing =
		agenda.data && urgent
			? buildBriefing(agenda.data.items, urgent, workday, now)
			: undefined;

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<Tile
					label="Meetings"
					icon={CalendarClock}
					value={briefing?.meetings.length}
					hint={
						briefing &&
						(briefing.nextMeeting
							? `${formatDuration(briefing.meetingMinutes)} · next at ${time.format(new Date(briefing.nextMeeting.start))}`
							: briefing.meetings.length > 0
								? `${formatDuration(briefing.meetingMinutes)} · none left`
								: "Free day")
					}
				/>
				<Tile
					label="Free time left"
					icon={Coffee}
					value={briefing && formatDuration(briefing.freeMinutes)}
					hint={briefing && biggestBlock(briefing.free)}
				/>
				<Tile
					label="Due & overdue"
					icon={CircleAlert}
					value={briefing?.due.length}
					hint={briefing && (briefing.due[0]?.title ?? "Nothing due today")}
					alert={(briefing?.due.length ?? 0) > 0}
				/>
				<Tile
					label="Waiting on you"
					icon={UserRoundCheck}
					value={briefing?.waitingOnYou.length}
					hint={briefing && "Reviews & invitations"}
				/>
			</div>

			<div className="grid items-start gap-4 xl:grid-cols-2">
				<section
					className="rounded-xl border bg-card shadow-xs"
					aria-label="Your day"
				>
					<header className="flex items-center gap-2 border-b px-4 py-2.5">
						<Hourglass className="size-4 text-muted-foreground" />
						<h2 className="flex-1 text-sm font-semibold">Your day</h2>
						<span className="text-xs text-muted-foreground">
							Workday {prefs.workdayStart}–{prefs.workdayEnd}
						</span>
					</header>
					<div className="px-3 py-2">
						<QueryState query={agenda}>
							{({ errors }) => (
								<>
									<SourceErrors errors={errors} />
									{briefing && <Timeline briefing={briefing} now={now} />}
								</>
							)}
						</QueryState>
					</div>
				</section>
				{children && <div className="grid gap-4">{children}</div>}
			</div>
		</div>
	);
}

function biggestBlock(blocks: TimeBlock[]): string {
	const biggest = [...blocks].sort((a, b) => b.minutes - a.minutes)[0];
	return biggest
		? `Longest: ${span(biggest.start, biggest.end)}`
		: "No free blocks left";
}

type Entry =
	| { type: "meeting"; at: number; event: CalendarEvent }
	| { type: "free"; at: number; block: TimeBlock };

function Timeline({ briefing, now }: { briefing: Briefing; now: Date }) {
	const entries: Entry[] = [
		...briefing.meetings.map((event) => ({
			type: "meeting" as const,
			at: Date.parse(event.start),
			event,
		})),
		...briefing.free.map((block) => ({
			type: "free" as const,
			at: block.start.getTime(),
			block,
		})),
	].sort((a, b) => a.at - b.at);

	if (entries.length === 0) {
		return (
			<p className="py-6 text-center text-sm text-muted-foreground">
				No meetings and no workday left today.
			</p>
		);
	}
	return (
		<ol className="space-y-1">
			{entries.map((entry) =>
				entry.type === "meeting" ? (
					<MeetingRow key={entry.event.id} event={entry.event} now={now} />
				) : (
					<li
						key={`free-${entry.at}`}
						className="flex items-center gap-3 rounded-md border border-dashed px-2 py-2 text-sm text-muted-foreground"
					>
						<span className="w-28 shrink-0 text-xs tabular-nums">
							{span(entry.block.start, entry.block.end)}
						</span>
						<Coffee className="size-4" />
						Free · {formatDuration(entry.block.minutes)}
					</li>
				),
			)}
		</ol>
	);
}

function MeetingRow({ event, now }: { event: CalendarEvent; now: Date }) {
	const onClick = useItemClick(event);
	const past = Date.parse(event.end) <= now.getTime();
	const ongoing = !past && Date.parse(event.start) <= now.getTime();
	return (
		<li
			className={cn(
				"flex items-center gap-3 rounded-md px-2 py-1.5 text-sm",
				past && "opacity-50",
				ongoing && "bg-primary/5",
			)}
		>
			<span className="w-28 shrink-0 text-xs text-muted-foreground tabular-nums">
				{span(event.start, event.end)}
			</span>
			<ItemIcon
				source={event.source}
				kind={event.response === "needsAction" ? "invitation" : "event"}
			/>
			<a
				href={event.url}
				target="_blank"
				rel="noreferrer"
				onClick={onClick}
				className="min-w-0 flex-1 truncate text-foreground no-underline underline-offset-2 hover:underline"
			>
				{event.title}
			</a>
			{event.meetingUrl && !past && (
				<Button
					asChild
					size="sm"
					variant={ongoing ? "default" : "outline"}
					className="h-7"
				>
					<a href={event.meetingUrl} target="_blank" rel="noreferrer">
						<Video /> Join
					</a>
				</Button>
			)}
		</li>
	);
}

function Tile({
	label,
	icon: Icon,
	value,
	hint,
	alert,
}: {
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	value: ReactNode | undefined;
	hint: ReactNode | undefined;
	alert?: boolean;
}) {
	return (
		<div className="min-w-0 rounded-xl border bg-card p-4 shadow-xs">
			<p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
				<Icon className="size-3.5" />
				{label}
			</p>
			<div
				className={cn(
					"mt-2 truncate font-display text-2xl font-semibold tracking-tight tabular-nums",
					alert && "text-destructive",
				)}
			>
				{value === undefined ? <Skeleton className="h-8 w-14" /> : value}
			</div>
			{hint !== undefined && (
				<p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
			)}
		</div>
	);
}
