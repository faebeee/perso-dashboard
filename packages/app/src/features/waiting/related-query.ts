import type { CalendarEvent } from "@dashboard/core/calendar-event";
import type { RelatedQuery } from "@dashboard/core/integration";

/** People per meeting used for the related search. */
export const PREP_PEOPLE_LIMIT = 10;
const KEYWORD_LIMIT = 3;

/** Words that say nothing about a meeting's topic (English and German). */
const STOP_WORDS = new Set(
	`a an and the of for with to in on at by re fw fwd vs via
	meeting call sync sync-up catch catch-up check check-in update weekly daily
	standup stand-up review planning retro retrospective kickoff kick-off
	sprint session intro introduction discussion talk chat quick follow followup follow-up
	und oder der die das mit für fur zum zur von bei im am an auf
	besprechung termin abstimmung austausch jour fixe kurz kurze wöchentlich`.split(
		/\s+/,
	),
);

/** Pure: ticket keys like "EMI-6012" in a text. */
export function ticketKeys(text: string): string[] {
	return [...new Set(text.match(/\b[A-Z][A-Z0-9_]+-\d+\b/g) ?? [])];
}

/**
 * Pure: what to search for around a meeting. Keywords are the distinctive
 * words of the title (no keys, numbers, stop words or short words), so a
 * generic "Weekly sync" searches by people only.
 */
export function relatedQuery(
	meeting: CalendarEvent,
	since: Date,
): RelatedQuery {
	const keys = ticketKeys(meeting.title);
	const keywords = meeting.title
		.replace(/\b[A-Z][A-Z0-9_]+-\d+\b/g, " ")
		.split(/[^\p{L}\p{N}-]+/u)
		.map((w) => w.toLowerCase())
		.filter((w) => w.length >= 4 && !/^\d+$/.test(w) && !STOP_WORDS.has(w));
	return {
		people: (meeting.attendees ?? [])
			.map((a) => a.email)
			.slice(0, PREP_PEOPLE_LIMIT),
		keys,
		keywords: [...new Set(keywords)].slice(0, KEYWORD_LIMIT),
		since,
	};
}
