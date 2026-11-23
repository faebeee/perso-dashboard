import type { CalendarEvent } from "#/core/calendar-event";
import type { WaitingItem } from "#/core/waiting";

/**
 * Pure: meetings you organize where invitees haven't replied yet. All-day
 * events and meetings without other people are skipped.
 */
export function pendingRepliesToWaiting(
	events: readonly CalendarEvent[],
): WaitingItem[] {
	return events.flatMap((event): WaitingItem[] => {
		if (!event.isOrganizer || event.allDay) return [];
		const invited = event.attendees ?? [];
		const pending = invited.filter((a) => a.response === "needsAction");
		if (pending.length === 0) return [];
		const names = pending.map((a) => a.name ?? a.email);
		return [
			{
				id: `${event.id}:waiting`,
				source: event.source,
				reason: "invitation_replies",
				title: event.title,
				url: event.url,
				since: new Date(event.start).toISOString(),
				label:
					pending.length === invited.length
						? `Nobody replied yet (${invited.length})`
						: `${pending.length} of ${invited.length} haven't replied`,
				detailRef: event.detailRef,
				context:
					names.slice(0, 3).join(", ") +
					(names.length > 3 ? ` +${names.length - 3}` : ""),
			},
		];
	});
}
