import { useQuery } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import { useSources } from "#/components/source-kit/source-context";
import type { AttentionItem } from "#/core/attention";
import { selectAlerts } from "#/features/attention/alerts";
import { useAttention } from "#/features/attention/queries";
import {
	briefingSummary,
	buildBriefing,
	workdayOn,
} from "#/features/today/briefing";
import { todayQueries } from "#/features/today/queries";
import { localDayKey } from "#/lib/time";
import { getHost } from "#/platform/host";
import { minutesOfDay, preferences } from "#/platform/preferences";

/** Persisted so restarting the app doesn't repeat notifications. */
const SEEN_KEY = "attention.notified";
/** Day (YYYY-MM-DD) the morning briefing was last sent. */
const BRIEFING_KEY = "briefing.lastDay";
/** More than this at once collapses into one summary notification. */
const MAX_INDIVIDUAL_ALERTS = 3;

/**
 * Headless: mirrors the urgent items into the menu bar, Dock badge and
 * desktop notifications. Mounted once at the root, so it keeps working while
 * the window is hidden.
 */
export function DesktopSync() {
	const { data } = useAttention();
	const sources = useSources();
	const prefs = useSyncExternalStore(preferences.subscribe, preferences.get);
	const { notifications } = prefs;
	const agenda = useQuery(todayQueries.agenda());

	// Morning briefing: once a day, the first time we have data during work hours.
	useEffect(() => {
		if (!data || !agenda.data) return;
		if (!notifications || !prefs.morningBriefing) return;
		const now = new Date();
		const workday = workdayOn(
			now,
			minutesOfDay(prefs.workdayStart),
			minutesOfDay(prefs.workdayEnd),
		);
		if (now < workday.start || now >= workday.end) return;
		const today = localDayKey(now.getTime());
		if (readKey(BRIEFING_KEY) === today) return;
		writeKey(BRIEFING_KEY, today);

		const summary = briefingSummary(
			buildBriefing(agenda.data.items, data.items, workday, now),
		);
		getHost()
			.desktop.notify({ title: "Your day", body: summary })
			.catch((cause) => console.error("Notification failed", cause));
	}, [data, agenda.data, notifications, prefs]);

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

function readKey(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function writeKey(key: string, value: string) {
	try {
		localStorage.setItem(key, value);
	} catch {
		// best effort
	}
}
