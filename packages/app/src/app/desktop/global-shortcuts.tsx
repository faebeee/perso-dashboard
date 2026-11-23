import { getHost } from "@dashboard/platform/host";
import {
	preferences,
	QUICK_CAPTURE_SHORTCUT,
} from "@dashboard/platform/preferences";
import { useEffect, useSyncExternalStore } from "react";
import { useOpenQuickCapture } from "#/features/today/components/quick-capture";

/** Headless: system-wide shortcuts (quick capture), per Preferences. */
export function GlobalShortcuts() {
	const openCapture = useOpenQuickCapture();
	const { quickCaptureShortcut } = useSyncExternalStore(
		preferences.subscribe,
		preferences.get,
	);

	useEffect(() => {
		if (!quickCaptureShortcut) return;
		const { desktop } = getHost();
		let unregister: (() => Promise<void>) | undefined;
		let cancelled = false;
		desktop
			.registerGlobalShortcut(QUICK_CAPTURE_SHORTCUT, () => {
				desktop.showWindow().catch(() => {});
				openCapture();
			})
			.then((remove) => {
				if (cancelled) void remove();
				else unregister = remove;
			})
			.catch((cause) =>
				console.error("Could not register the quick capture shortcut", cause),
			);
		return () => {
			cancelled = true;
			void unregister?.();
		};
	}, [quickCaptureShortcut, openCapture]);

	return null;
}
