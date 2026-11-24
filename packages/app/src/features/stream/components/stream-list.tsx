import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { cn } from "@dashboard/ui/lib/utils";
import { X } from "lucide-react";
import { RowActions } from "#/components/item-actions/item-actions";
import { useItemClick } from "#/components/item-detail/item-detail-provider";
import { ItemIcon } from "#/components/source-kit/item-icon";
import { useSource } from "#/components/source-kit/source-context";
import { formatRelative, localDayKey } from "#/lib/time";
import type { StreamEvent } from "../stream";

interface StreamListProps {
	events: readonly StreamEvent[];
	/** Entries that arrived while the page was open: highlighted. */
	fresh: ReadonlySet<string>;
	now: number;
	onClear(event: StreamEvent): void;
}

const dayFormat = new Intl.DateTimeFormat(undefined, {
	weekday: "long",
	day: "numeric",
	month: "long",
});

/** Pure: "Today", "Yesterday" or the date. */
export function dayLabel(ms: number, now: number): string {
	const day = localDayKey(ms);
	if (day === localDayKey(now)) return "Today";
	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	if (day === localDayKey(yesterday.getTime())) return "Yesterday";
	return dayFormat.format(ms);
}

/** The stream, newest on top, in one section per day. */
export function StreamList({ events, fresh, now, onClear }: StreamListProps) {
	const days: { label: string; events: StreamEvent[] }[] = [];
	for (const event of events) {
		const label = dayLabel(Date.parse(event.at), now);
		const last = days.at(-1);
		if (last?.label === label) last.events.push(event);
		else days.push({ label, events: [event] });
	}

	return (
		<div className="space-y-5">
			{days.map((day) => (
				<section key={day.label} aria-label={day.label}>
					<h2 className="sticky top-0 z-10 bg-background/95 px-1 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase backdrop-blur">
						{day.label}
					</h2>
					<ul className="divide-y divide-border">
						{day.events.map((event) => (
							<li key={event.id}>
								<StreamRow
									event={event}
									fresh={fresh.has(event.id)}
									now={now}
									onClear={() => onClear(event)}
								/>
							</li>
						))}
					</ul>
				</section>
			))}
		</div>
	);
}

function StreamRow({
	event,
	fresh,
	now,
	onClear,
}: {
	event: StreamEvent;
	fresh: boolean;
	now: number;
	onClear(): void;
}) {
	const onClick = useItemClick(event);
	const source = useSource(event.source);
	return (
		<div
			className={cn(
				"group relative flex items-start gap-1 rounded-md transition-colors hover:bg-accent/60",
				fresh &&
					"bg-primary/5 animate-in fade-in slide-in-from-top-2 duration-500",
			)}
		>
			{fresh && (
				<span
					className="absolute top-4 left-0 size-1.5 -translate-x-2.5 rounded-full bg-primary"
					title="New since you opened the page"
				/>
			)}
			<a
				href={event.url}
				target="_blank"
				rel="noreferrer"
				onClick={onClick}
				className="flex min-w-0 flex-1 items-start gap-3 px-1 py-2.5 text-inherit no-underline"
			>
				<ItemIcon source={event.source} kind={event.kind} className="mt-0.5" />
				<div className="min-w-0 flex-1">
					<p className="text-xs text-muted-foreground">
						<span className="font-medium text-foreground/80">{event.verb}</span>
						{source && <> · {source.name}</>}
						{event.actor && <> · {event.actor.name}</>}
					</p>
					<p className="truncate text-sm font-medium text-foreground underline-offset-2 group-hover:underline">
						{event.title}
					</p>
					{event.context && (
						<p className="truncate text-xs text-muted-foreground">
							{event.context}
						</p>
					)}
				</div>
				<div className="flex shrink-0 flex-col items-end gap-1">
					<time
						dateTime={event.at}
						title={new Date(event.at).toLocaleString()}
						className="text-xs text-muted-foreground"
					>
						{formatRelative(event.at, now)}
					</time>
					{event.status && (
						<Badge variant="secondary" className="hidden sm:inline-flex">
							{event.status}
						</Badge>
					)}
				</div>
			</a>
			<RowActions className="self-center pr-1">
				<Button
					size="icon"
					variant="ghost"
					className="size-7"
					aria-label={`Clear “${event.title}”`}
					title="Clear"
					onClick={onClear}
				>
					<X />
				</Button>
			</RowActions>
		</div>
	);
}
