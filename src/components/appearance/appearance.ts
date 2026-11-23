import { useSyncExternalStore } from "react";
import {
	APPEARANCE_IDS,
	APPEARANCE_STORAGE_KEY,
	type AppearanceId,
	COLOR_MODE_STORAGE_KEY,
} from "./theme-init";

export type ColorMode = "system" | "light" | "dark";
export const COLOR_MODES: ColorMode[] = ["system", "light", "dark"];

export interface AppearanceState {
	mode: ColorMode;
	theme: AppearanceId;
}

const listeners = new Set<() => void>();
const darkQuery =
	typeof matchMedia === "function"
		? matchMedia("(prefers-color-scheme: dark)")
		: null;

function readStored(): AppearanceState {
	try {
		const mode = localStorage.getItem(
			COLOR_MODE_STORAGE_KEY,
		) as ColorMode | null;
		const theme = localStorage.getItem(
			APPEARANCE_STORAGE_KEY,
		) as AppearanceId | null;
		return {
			mode: mode && COLOR_MODES.includes(mode) ? mode : "system",
			theme: theme && APPEARANCE_IDS.includes(theme) ? theme : "default",
		};
	} catch {
		return { mode: "system", theme: "default" };
	}
}

let state: AppearanceState = readStored();

function apply() {
	const root = document.documentElement;
	const dark =
		state.mode === "dark" ||
		(state.mode === "system" && (darkQuery?.matches ?? false));
	root.classList.toggle("dark", dark);
	if (state.theme === "default") delete root.dataset.theme;
	else root.dataset.theme = state.theme;
}

// "System" follows the OS live, not only at startup.
darkQuery?.addEventListener("change", () => {
	if (state.mode === "system") apply();
});

function update(patch: Partial<AppearanceState>) {
	state = { ...state, ...patch };
	try {
		localStorage.setItem(COLOR_MODE_STORAGE_KEY, state.mode);
		localStorage.setItem(APPEARANCE_STORAGE_KEY, state.theme);
	} catch {
		// applied for this session only
	}
	apply();
	for (const listener of listeners) listener();
}

/** Light/dark mode and theme, shared by the sidebar toggle, Preferences and ⌘K. */
export const appearance = {
	get: (): AppearanceState => state,
	subscribe(listener: () => void) {
		listeners.add(listener);
		return () => listeners.delete(listener);
	},
	setMode: (mode: ColorMode) => update({ mode }),
	setTheme: (theme: AppearanceId) => update({ theme }),
};

export function useAppearance(): AppearanceState {
	return useSyncExternalStore(
		appearance.subscribe,
		appearance.get,
		appearance.get,
	);
}
