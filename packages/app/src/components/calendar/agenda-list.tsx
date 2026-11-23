import {
	type CalendarEvent,
	eventStartMs,
} from "@dashboard/core/calendar-event";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { cn } from "@dashboard/ui/lib/utils";
import { MapPin, Video } from "lucide-react";
import { useItemClick } from "#/components/item-detail/item-detail-provider";
import { ItemIcon } from "#/components/source-kit/item-icon";
import { localDayKey } from "#/lib/time";

interface AgendaListProps {
	events: CalendarEvent[];
	now?: number;
}

/** Day-grouped agenda for any calendar provider. Renders in the viewer's time zone. */
export function AgendaList({ events, now = Date.now() }: AgendaListProps) {
	const groups = groupByDay(events, now);
	return (
		<div className="space-y-3 py-1">
			{groups.map(({ day, label, events: dayEvents }) => (
				<section key={day} aria-label={label}>
					<h3 className="sticky top-0 z-10 bg-card px-1 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
						{label}
					</h3>
					<ul className="space-y-1">
						{dayEvents.map((event) => (
							<li key={event.id}>
								<AgendaRow event={event} now={now} />
							</li>
						))}
					</ul>
				</section>
			))}
		</div>
	);
}

function AgendaRow({ event, now }: { event: CalendarEvent; now: number }) {
	const onClick = useItemClick(event);
	const ongoing =
		!event.allDay &&
		Date.parse(event.start) <= now &&
		now < Date.parse(event.end);

	return (
		<div
			className={cn(
				"flex items-start gap-3 rounded-md px-1 py-2 hover:bg-accent/60",
				ongoing && "bg-primary/5",
			)}
		>
			<ItemIcon
				source={event.source}
				kind={event.response === "needsAction" ? "invitation" : "event"}
			/>
			<div className="w-24 shrink-0 pt-1.5 text-xs tabular-nums text-muted-foreground">
				{event.allDay
					? "All day"
					: `${formatTime(event.start)} – ${formatTime(event.end)}`}
			</div>

			<div className="min-w-0 flex-1">
				<a
					href={event.url}
					target="_blank"
					rel="noreferrer"
					onClick={onClick}
					className="block truncate text-sm font-medium text-foreground no-underline hover:underline underline-offset-2"
				>
					{event.title}
				</a>
				<div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
					{ongoing && <Badge>Now</Badge>}
					{event.response === "needsAction" && (
						<Badge variant="outline">Not answered</Badge>
					)}
					{event.response === "tentative" && (
						<Badge variant="outline">Maybe</Badge>
					)}
					{event.location && (
						<span className="inline-flex min-w-0 items-center gap-1">
							<MapPin className="size-3 shrink-0" />
							<span className="truncate">{event.location}</span>
						</span>
					)}
				</div>
			</div>

			{event.meetingUrl && (
				<Button
					asChild
					size="sm"
					variant={ongoing ? "default" : "outline"}
					className="h-7 shrink-0"
				>
					<a href={event.meetingUrl} target="_blank" rel="noreferrer">
						<Video /> Join
					</a>
				</Button>
			)}
		</div>
	);
}

const timeFormat = new Intl.DateTimeFormat(undefined, {
	hour: "2-digit",
	minute: "2-digit",
});
const dayFormat = new Intl.DateTimeFormat(undefined, {
	weekday: "long",
	month: "short",
	day: "numeric",
});

const formatTime = (iso: string) => timeFormat.format(new Date(iso));

function dayLabel(key: string, now: number): string {
	const today = localDayKey(now);
	const tomorrow = localDayKey(now + 24 * 60 * 60 * 1000);
	if (key === today) return "Today";
	if (key === tomorrow) return "Tomorrow";
	return dayFormat.format(new Date(`${key}T00:00:00`));
}

/** Events that started before today (ongoing / multi-day) are shown under Today. */
export function groupByDay(events: readonly CalendarEvent[], now: number) {
	const today = localDayKey(now);
	const groups = new Map<string, CalendarEvent[]>();
	for (const event of events) {
		const startKey = localDayKey(eventStartMs(event));
		const day = startKey < today ? today : startKey;
		groups.set(day, [...(groups.get(day) ?? []), event]);
	}
	return [...groups.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([day, dayEvents]) => ({
			day,
			label: dayLabel(day, now),
			events: dayEvents,
		}));
}
