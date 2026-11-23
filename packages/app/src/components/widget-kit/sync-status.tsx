import { type SyncState, syncStatus } from "@dashboard/platform/sync-status";
import { cn } from "@dashboard/ui/lib/utils";
import { CloudOff, PauseCircle, RefreshCw } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { formatRelative } from "#/lib/time";

export interface SyncDescription {
	tone: "ok" | "paused" | "offline";
	text: string;
}

const time = new Intl.DateTimeFormat(undefined, {
	hour: "2-digit",
	minute: "2-digit",
});

/** Pure: what to tell the user about one integration's sync state. */
export function describeSync(
	state: SyncState | undefined,
	now: number,
): SyncDescription | null {
	if (!state) return null;
	if (state.pausedUntil && state.pausedUntil > now) {
		return {
			tone: "paused",
			text: `Paused by rate limit until ${time.format(state.pausedUntil)}${state.servingCache ? " · showing cached data" : ""}`,
		};
	}
	if (state.servingCache === "network" || state.servingCache === "server") {
		return {
			tone: "offline",
			text: `${state.servingCache === "network" ? "Offline" : "Service unavailable"} · showing cached data`,
		};
	}
	if (state.lastSyncedAt) {
		const ago = formatRelative(new Date(state.lastSyncedAt).toISOString(), now);
		return { tone: "ok", text: `Synced ${ago}` };
	}
	return null;
}

/** Re-renders every `intervalMs` so relative times stay current. */
export function useNow(intervalMs = 30_000): number {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), intervalMs);
		return () => clearInterval(timer);
	}, [intervalMs]);
	return now;
}

export function useSyncSnapshot() {
	return useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
}

const ICONS = {
	ok: RefreshCw,
	paused: PauseCircle,
	offline: CloudOff,
} as const;

/** One line of sync state for an integration ("Synced 2 min ago"…). */
export function SyncLine({
	integrationId,
	className,
}: {
	integrationId: string;
	className?: string;
}) {
	const snapshot = useSyncSnapshot();
	const now = useNow();
	const description = describeSync(snapshot[integrationId], now);
	if (!description) return null;
	const Icon = ICONS[description.tone];
	return (
		<p
			className={cn(
				"flex items-center gap-1.5 text-xs",
				description.tone === "ok"
					? "text-muted-foreground"
					: "text-amber-600 dark:text-amber-400",
				className,
			)}
		>
			<Icon className="size-3.5 shrink-0" />
			{description.text}
		</p>
	);
}
