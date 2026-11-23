import type { AttentionItem } from "./attention";

/** You cleared an urgent item ("done") or put it off ("snoozed"). */
export interface Dismissal {
	itemId: string;
	mode: "done" | "snoozed";
	/** Snoozed only: when it comes back. */
	until: Date | null;
	/** The item's state when dismissed; see `attentionFingerprint`. */
	fingerprint: string;
}

/**
 * What must change for a "done" item to come back: its urgency or reason
 * (a meeting going from "today" to "now", an issue becoming overdue).
 * Countdown labels ("Starts in 12m") deliberately don't count.
 */
export const attentionFingerprint = (item: AttentionItem) =>
	`${item.urgency}|${item.reason}`;

export interface DismissedItem {
	item: AttentionItem;
	dismissal: Dismissal;
}

/** Pure: splits items into visible and hidden (done/snoozed) ones. */
export function applyDismissals(
	items: readonly AttentionItem[],
	dismissals: readonly Dismissal[],
	now: Date,
): { visible: AttentionItem[]; hidden: DismissedItem[] } {
	const byId = new Map(dismissals.map((d) => [d.itemId, d]));
	const visible: AttentionItem[] = [];
	const hidden: DismissedItem[] = [];
	for (const item of items) {
		const dismissal = byId.get(item.id);
		const active =
			dismissal &&
			(dismissal.mode === "snoozed"
				? (dismissal.until?.getTime() ?? 0) > now.getTime()
				: dismissal.fingerprint === attentionFingerprint(item));
		if (dismissal && active) hidden.push({ item, dismissal });
		else visible.push(item);
	}
	return { visible, hidden };
}

export type SnoozeOption = "1h" | "3h" | "tomorrow" | "next_week";

/**
 * Pure: when a snooze ends. "tomorrow" / "next week" mean the start of your
 * workday (`workdayStart` = minutes after midnight, local time).
 */
export function snoozeUntil(
	option: SnoozeOption,
	now: Date,
	workdayStart: number,
): Date {
	const atWorkdayStart = (daysAhead: number) => {
		const d = new Date(now);
		d.setDate(d.getDate() + daysAhead);
		d.setHours(Math.floor(workdayStart / 60), workdayStart % 60, 0, 0);
		return d;
	};
	switch (option) {
		case "1h":
			return new Date(now.getTime() + 60 * 60_000);
		case "3h":
			return new Date(now.getTime() + 3 * 60 * 60_000);
		case "tomorrow":
			return atWorkdayStart(1);
		case "next_week": {
			// Next Monday (a Monday "now" means the Monday after).
			const daysToMonday = (8 - now.getDay()) % 7 || 7;
			return atWorkdayStart(daysToMonday);
		}
	}
}
