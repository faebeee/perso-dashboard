import type { ItemKind } from "#/components/source-kit/item-icon";

/**
 * One change shown in the Live stream: a new mail, a ticket update, a
 * commit. Its id includes the moment, so the next change of the same item
 * is a new entry (and shows again after you cleared the last one).
 */
export interface StreamEvent {
	/** `${itemId}@${at}` */
	id: string;
	itemId: string;
	source: string;
	kind: ItemKind;
	/** What happened: "Ticket updated", "Commit", "You merged"… */
	verb: string;
	title: string;
	url: string;
	/** ISO: when it happened. */
	at: string;
	context?: string;
	status?: string;
	actor?: { name: string; avatarUrl?: string };
	detailRef?: string;
}

/** How far back the stream reaches. */
export const STREAM_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

/** Most entries shown at once. */
export const STREAM_LIMIT = 200;

/** The moment is normalized, so "+01:00" and "Z" notations match. */
export function streamEventId(itemId: string, at: string): string {
	const ms = Date.parse(at);
	return `${itemId}@${Number.isNaN(ms) ? at : new Date(ms).toISOString()}`;
}

/**
 * Pure: what the stream shows. Drops cleared entries, the future
 * (scheduled things) and anything older than the window, merges duplicates
 * (same link, same minute: the first one wins) and puts the newest on top.
 */
export function visibleStream(
	events: readonly StreamEvent[],
	cleared: ReadonlySet<string>,
	now: number,
	limit = STREAM_LIMIT,
): StreamEvent[] {
	const seen = new Set<string>();
	const kept: StreamEvent[] = [];
	for (const event of events) {
		const at = Date.parse(event.at);
		if (Number.isNaN(at) || at > now + 60_000 || at < now - STREAM_WINDOW_MS)
			continue;
		if (cleared.has(event.id)) continue;
		const same = `${event.url}|${Math.floor(at / 60_000)}`;
		if (seen.has(event.id) || seen.has(same)) continue;
		seen.add(event.id);
		seen.add(same);
		kept.push(event);
	}
	return kept
		.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
		.slice(0, limit);
}

/**
 * Pure: entries that weren't there before. `known` is null on the first
 * load, when nothing counts as new.
 */
export function arrivals(
	events: readonly StreamEvent[],
	known: ReadonlySet<string> | null,
): string[] {
	if (!known) return [];
	return events.filter((e) => !known.has(e.id)).map((e) => e.id);
}
