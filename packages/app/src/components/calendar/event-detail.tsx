import type {
	AttendeeResponse,
	EventDetail,
} from "@dashboard/core/calendar-event";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { cn } from "@dashboard/ui/lib/utils";
import {
	CircleCheck,
	CircleDashed,
	CircleHelp,
	CircleX,
	MapPin,
	Video,
} from "lucide-react";
import {
	DetailSection,
	Meta,
	MetaGrid,
} from "#/components/item-detail/detail-kit";
import { SafeHtmlFrame } from "#/components/item-detail/safe-html-frame";
import { formatDuration } from "#/lib/time";

const GROUPS: {
	response: AttendeeResponse;
	label: string;
	icon: typeof CircleCheck;
	className: string;
}[] = [
	{
		response: "accepted",
		label: "Going",
		icon: CircleCheck,
		className: "text-emerald-600 dark:text-emerald-400",
	},
	{
		response: "tentative",
		label: "Maybe",
		icon: CircleHelp,
		className: "text-amber-600 dark:text-amber-400",
	},
	{
		response: "needsAction",
		label: "No reply",
		icon: CircleDashed,
		className: "text-muted-foreground",
	},
	{
		response: "declined",
		label: "Declined",
		icon: CircleX,
		className: "text-destructive",
	},
];

const dayFormat = new Intl.DateTimeFormat(undefined, {
	weekday: "long",
	day: "numeric",
	month: "long",
});
const timeFormat = new Intl.DateTimeFormat(undefined, {
	hour: "2-digit",
	minute: "2-digit",
});

function when(event: EventDetail): string {
	if (event.allDay)
		return `${dayFormat.format(new Date(`${event.start}T00:00:00`))} · all day`;
	const start = new Date(event.start);
	const end = new Date(event.end);
	const minutes = (end.getTime() - start.getTime()) / 60_000;
	return `${dayFormat.format(start)} · ${timeFormat.format(start)}–${timeFormat.format(end)} (${formatDuration(minutes)})`;
}

/** Body of the event detail modal, for any calendar provider. */
export function EventDetailBody({ event }: { event: EventDetail }) {
	const you = event.attendees.find((a) => a.you);
	return (
		<div>
			<p className="mb-3 text-sm font-medium">{when(event)}</p>

			<MetaGrid>
				<Meta label="Organizer">
					{event.organizer ? (
						<span title={event.organizer.email}>
							{event.organizer.you ? "You" : event.organizer.name}
						</span>
					) : (
						"—"
					)}
				</Meta>
				<Meta label="Your reply">
					{you ? GROUPS.find((g) => g.response === you.response)?.label : "—"}
				</Meta>
				{event.location && (
					<Meta label="Where">
						<span className="inline-flex max-w-full items-center gap-1">
							<MapPin className="size-3.5 shrink-0" />
							<span className="truncate">{event.location}</span>
						</span>
					</Meta>
				)}
			</MetaGrid>

			{event.meetingUrl && (
				<Button asChild size="sm" className="mt-4">
					<a href={event.meetingUrl} target="_blank" rel="noreferrer">
						<Video /> Join meeting
					</a>
				</Button>
			)}

			{event.attendees.length > 0 && (
				<DetailSection title={`People (${event.attendees.length})`}>
					<div className="grid gap-3 sm:grid-cols-2">
						{GROUPS.map((group) => {
							const people = event.attendees.filter(
								(a) => a.response === group.response,
							);
							if (people.length === 0) return null;
							return (
								<div key={group.response}>
									<p
										className={cn(
											"mb-1 flex items-center gap-1 text-xs font-medium",
											group.className,
										)}
									>
										<group.icon className="size-3.5" /> {group.label} (
										{people.length})
									</p>
									<ul className="space-y-0.5 text-sm">
										{people.map((person) => (
											<li
												key={person.email ?? person.name}
												className="flex items-center gap-1.5"
												title={person.email}
											>
												<span className="truncate">
													{person.you ? "You" : person.name}
												</span>
												{person.organizer && (
													<Badge variant="outline">Organizer</Badge>
												)}
												{person.optional && (
													<span className="text-xs text-muted-foreground">
														optional
													</span>
												)}
											</li>
										))}
									</ul>
								</div>
							);
						})}
					</div>
				</DetailSection>
			)}

			<DetailSection title="Description">
				{event.descriptionHtml ? (
					<SafeHtmlFrame
						title={`${event.title} description`}
						html={event.descriptionHtml}
					/>
				) : (
					<p className="text-sm text-muted-foreground italic">
						No description.
					</p>
				)}
			</DetailSection>
		</div>
	);
}
