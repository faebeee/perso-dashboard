import { z } from "zod";

/**
 * Per-device app preferences. Settings that belong to the OS (launch at
 * login) are read from the OS instead and don't live here.
 */
const preferencesSchema = z.object({
	/** Desktop notifications for urgent items. */
	notifications: z.boolean().default(true),
});

export type Preferences = z.infer<typeof preferencesSchema>;

const STORAGE_KEY = "preferences";
const listeners = new Set<() => void>();
let cached: Preferences | undefined;

function read(): Preferences {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		const parsed = preferencesSchema.safeParse(raw ? JSON.parse(raw) : {});
		if (parsed.success) return parsed.data;
	} catch {
		// storage unavailable or corrupt: defaults
	}
	return preferencesSchema.parse({});
}

export const preferences = {
	/** Stable snapshot (safe for useSyncExternalStore). */
	get(): Preferences {
		cached ??= read();
		return cached;
	},

	set<K extends keyof Preferences>(key: K, value: Preferences[K]): void {
		cached = { ...preferences.get(), [key]: value };
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
		} catch {
			// keep the in-memory value
		}
		for (const listener of listeners) listener();
	},

	subscribe(listener: () => void): () => void {
		listeners.add(listener);
		return () => listeners.delete(listener);
	},
};
