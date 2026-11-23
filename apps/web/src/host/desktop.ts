import type {
	DesktopShell,
	NotificationPermission,
	UrgentSummary,
} from "@dashboard/platform/host";

const APP_TITLE = "Productivity Dashboard";

/**
 * The browser's take on the native shell: the urgent count goes to the tab
 * title (and the app badge when installed as a PWA), notifications use the
 * Notification API, shortcuts work while the tab is focused. There is no
 * tray and no login item.
 */
export function createBrowserShell(): DesktopShell {
	const supportsNotifications = () => typeof Notification !== "undefined";

	return {
		capabilities: {
			launchAtLogin: false,
			backgroundShortcuts: false,
			runsInBackground: false,
		},

		async setUrgentSummary({ count }: UrgentSummary) {
			document.title = count > 0 ? `(${count}) ${APP_TITLE}` : APP_TITLE;
			const nav = navigator as Navigator & {
				setAppBadge?: (count?: number) => Promise<void>;
				clearAppBadge?: () => Promise<void>;
			};
			await (count > 0
				? nav.setAppBadge?.(count)
				: nav.clearAppBadge?.()
			)?.catch(
				() => {}, // only installed web apps have a badge
			);
		},

		async notificationPermission(): Promise<NotificationPermission> {
			return supportsNotifications() ? Notification.permission : "denied";
		},

		async requestNotificationPermission() {
			if (!supportsNotifications()) return "denied";
			return Notification.requestPermission();
		},

		async notify({ title, body }) {
			if (!supportsNotifications() || Notification.permission !== "granted") {
				return;
			}
			const notification = new Notification(title, { body });
			notification.onclick = () => window.focus();
		},

		async getLaunchAtLogin() {
			return false;
		},

		async setLaunchAtLogin() {
			throw new Error("The web app can't open at login. Use the desktop app.");
		},

		async showWindow() {
			window.focus();
		},

		async registerGlobalShortcut(accelerator, onPress) {
			const matches = parseAccelerator(accelerator);
			const onKeyDown = (event: KeyboardEvent) => {
				if (!matches(event)) return;
				event.preventDefault();
				onPress();
			};
			window.addEventListener("keydown", onKeyDown);
			return async () => window.removeEventListener("keydown", onKeyDown);
		},
	};
}

/** "Control+Alt+Space" → a keydown matcher (modifiers must match exactly). */
export function parseAccelerator(
	accelerator: string,
): (
	event: Pick<
		KeyboardEvent,
		"key" | "code" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey"
	>,
) => boolean {
	const parts = accelerator.split("+").map((p) => p.trim().toLowerCase());
	const key = parts.pop() ?? "";
	const has = (...names: string[]) => names.some((n) => parts.includes(n));
	const ctrl = has("control", "ctrl");
	const alt = has("alt", "option");
	const shift = has("shift");
	const meta = has("super", "meta", "command", "cmd");
	return (event) =>
		event.ctrlKey === ctrl &&
		event.altKey === alt &&
		event.shiftKey === shift &&
		event.metaKey === meta &&
		// `code` ignores layout and the characters Alt/Option produce.
		(event.code.toLowerCase() === key ||
			event.code.toLowerCase() === `key${key}` ||
			event.key.toLowerCase() === key ||
			(key === "space" && event.code === "Space"));
}
