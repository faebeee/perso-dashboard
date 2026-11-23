import type { AttentionItem } from "@dashboard/core/attention";

/**
 * Notification rule: alert once per item *and* urgency, so an item that
 * escalates (a meeting going from "in 2h" to "in 10 min") alerts again.
 *
 * - First run (nothing remembered yet): only "now" items, to avoid a burst
 *   of alerts for everything that was already on the list.
 * - Afterwards: items newly at "now" or "today". "Soon" never alerts.
 *
 * `seen` should be persisted between runs; the returned set replaces it and
 * only holds keys of current items, so it never grows unbounded.
 */
export function selectAlerts(
	items: readonly AttentionItem[],
	seen: ReadonlySet<string> | null,
): { alerts: AttentionItem[]; seen: Set<string> } {
	const firstRun = seen === null;
	const alerting = (item: AttentionItem) =>
		item.urgency === "now" || (!firstRun && item.urgency === "today");

	return {
		alerts: items.filter(
			(item) => alerting(item) && !seen?.has(alertKey(item)),
		),
		seen: new Set(items.map(alertKey)),
	};
}

const alertKey = (item: AttentionItem) => `${item.id}|${item.urgency}`;
