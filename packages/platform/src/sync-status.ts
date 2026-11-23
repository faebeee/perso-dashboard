import type { SyncEvent } from "./http-cache";

/** Per integration: when data was last fetched, and whether an API is paused. */
export interface SyncState {
	/** Last successful request (epoch ms). */
	lastSyncedAt: number | null;
	/** The API's rate limit is exhausted until then (epoch ms). */
	pausedUntil: number | null;
	/** The last request was answered from cache because the API wasn't usable. */
	servingCache: "rate_limited" | "network" | "server" | null;
}

export type SyncSnapshot = Readonly<Record<string, SyncState>>;

const EMPTY: SyncState = {
	lastSyncedAt: null,
	pausedUntil: null,
	servingCache: null,
};

let snapshot: SyncSnapshot = {};
const listeners = new Set<() => void>();

function update(integrationId: string, patch: Partial<SyncState>) {
	const current = snapshot[integrationId] ?? EMPTY;
	const next = { ...current, ...patch };
	if (
		next.lastSyncedAt === current.lastSyncedAt &&
		next.pausedUntil === current.pausedUntil &&
		next.servingCache === current.servingCache
	) {
		return;
	}
	snapshot = { ...snapshot, [integrationId]: next };
	for (const listener of listeners) listener();
}

/** Observable store for useSyncExternalStore. */
export const syncStatus = {
	get: (): SyncSnapshot => snapshot,

	subscribe(listener: () => void): () => void {
		listeners.add(listener);
		return () => listeners.delete(listener);
	},

	/** Feeds http-cache events in. */
	record(event: SyncEvent): void {
		switch (event.type) {
			case "synced":
				update(event.integrationId, {
					lastSyncedAt: event.at,
					servingCache: null,
					pausedUntil: null,
				});
				return;
			case "paused":
				update(event.integrationId, { pausedUntil: event.until });
				return;
			case "stale":
				update(event.integrationId, {
					servingCache: event.reason,
					pausedUntil:
						event.pausedUntil ??
						snapshot[event.integrationId]?.pausedUntil ??
						null,
				});
				return;
		}
	},

	/** Forget an integration (disconnected). */
	reset(integrationId: string): void {
		if (!(integrationId in snapshot)) return;
		const { [integrationId]: _removed, ...rest } = snapshot;
		snapshot = rest;
		for (const listener of listeners) listener();
	},
};
