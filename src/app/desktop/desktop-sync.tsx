import { useQuery } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import { useSources } from "#/components/source-kit/source-context";
import type { AttentionItem } from "#/core/attention";
import { selectAlerts } from "#/features/attention/alerts";
import { attentionQueries } from "#/features/attention/queries";
import { getHost } from "#/platform/host";
import { preferences } from "#/platform/preferences";

/** Persisted so restarting the app doesn't repeat notifications. */
const SEEN_KEY = "attention.notified";
/** More than this at once collapses into one summary notification. */
const MAX_INDIVIDUAL_ALERTS = 3;

/**
 * Headless: mirrors the urgent items into the menu bar, Dock badge and
 * desktop notifications. Mounted once at the root, so it keeps working while
 * the window is hidden.
 */
export function DesktopSync() {
	const { data } = useQuery(attentionQueries.all());
	const sources = useSources();
	const { notifications } = useSyncExternalStore(
		preferences.subscribe,
		preferences.get,
	);

	useEffect(() => {
		if (!data) return;
		const { items } = data;
		const nameOf = (item: AttentionItem) =>
			sources[item.source]?.name ?? item.source;

		const { desktop } = getHost();
		desktop
			.setUrgentSummary({
				count: items.length,
				items: items.map((item) => ({
					id: item.id,
					title: item.title,
					detail: `${nameOf(item)} · ${item.label}`,
					url: item.url,
				})),
			})
			.catch((cause) => console.error("Could not update the tray", cause));

		const { alerts, seen } = selectAlerts(items, loadSeen());
		saveSeen(seen);
		if (!notifications || alerts.length === 0) return;

		const toSend =
			alerts.length > MAX_INDIVIDUAL_ALERTS
				? [
						{
							title: `${alerts.length} things need your attention`,
							body: alerts.map((a) => a.title).join(" · "),
						},
					]
				: alerts.map((item) => ({
						title: item.title,
						body: [nameOf(item), item.label, item.context]
							.filter(Boolean)
							.join(" · "),
					}));
		for (const notification of toSend) {
			desktop
				.notify(notification)
				.catch((cause) => console.error("Notification failed", cause));
		}
	}, [data, sources, notifications]);

	return null;
}

function loadSeen(): Set<string> | null {
	try {
		const raw = localStorage.getItem(SEEN_KEY);
		return raw ? new Set(JSON.parse(raw) as string[]) : null;
	} catch {
		return null;
	}
}

function saveSeen(seen: Set<string>) {
	try {
		localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
	} catch {
		// best effort
	}
}
