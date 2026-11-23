import {
	type AttentionItem,
	type AttentionRules,
	DEFAULT_ATTENTION_RULES,
	type Urgency,
} from "@dashboard/core/attention";
import {
	type CalendarEvent,
	eventStartMs,
} from "@dashboard/core/calendar-event";
import { formatDuration } from "#/lib/time";

const MINUTE_MS = 60_000;

/**
 * Pure: upcoming events → attention items. Meetings about to start (or
 * running) and invitations you haven't answered. One item per event.
 */
export function eventsToAttention(
	events: readonly CalendarEvent[],
	now: Date,
	rules: AttentionRules = DEFAULT_ATTENTION_RULES,
): AttentionItem[] {
	const nowMs = now.getTime();
	return events.flatMap((event): AttentionItem[] => {
		const startMs = eventStartMs(event);
		const minutesUntil = (startMs - nowMs) / MINUTE_MS;
		const unanswered = event.response === "needsAction";
		const join = event.meetingUrl
			? { label: "Join", url: event.meetingUrl }
			: undefined;
		const base = {
			id: `${event.id}:attention`,
			source: event.source,
			title: event.title,
			url: event.url,
			at: new Date(startMs).toISOString(),
			context: event.location,
			detailRef: event.detailRef,
		};

		if (!event.allDay) {
			const ongoing = minutesUntil <= 0 && nowMs < Date.parse(event.end);
			if (
				ongoing ||
				(minutesUntil > 0 && minutesUntil <= rules.meetingSoonMinutes)
			) {
				const urgency: Urgency =
					ongoing || minutesUntil <= rules.meetingNowMinutes ? "now" : "today";
				const when = ongoing
					? "Happening now"
					: `Starts in ${formatDuration(Math.ceil(minutesUntil))}`;
				return [
					{
						...base,
						reason: "meeting",
						urgency,
						label: unanswered ? `${when} · not answered` : when,
						action: join,
					},
				];
			}
		}

		const hoursUntil = minutesUntil / 60;
		if (
			unanswered &&
			hoursUntil > 0 &&
			hoursUntil <= rules.invitationWindowHours
		) {
			return [
				{
					...base,
					reason: "invitation",
					urgency: hoursUntil <= 24 ? "today" : "soon",
					label: "Invitation not answered",
				},
			];
		}
		return [];
	});
}
