import { invoke } from "@tauri-apps/api/core";
import { Menu } from "@tauri-apps/api/menu";
import { TrayIcon } from "@tauri-apps/api/tray";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import {
	isRegistered,
	register,
	unregister,
} from "@tauri-apps/plugin-global-shortcut";
import {
	isPermissionGranted,
	requestPermission,
	sendNotification,
} from "@tauri-apps/plugin-notification";
import type { DesktopShell, UrgentSummary } from "../host";

/** Created in src-tauri/src/desktop.rs. */
const TRAY_ID = "main";
const MAX_MENU_ITEMS = 8;
const MAX_TITLE = 60;

export interface DesktopShellOptions {
	/** In-app navigation, e.g. from the tray's "Open Urgent" item. */
	navigate: (path: string) => void;
	openExternal: (url: string) => Promise<void>;
}

const truncate = (text: string) =>
	text.length > MAX_TITLE ? `${text.slice(0, MAX_TITLE - 1)}…` : text;

export function createTauriDesktopShell({
	navigate,
	openExternal,
}: DesktopShellOptions): DesktopShell {
	const showWindow = () => invoke("show_window");
	const openPage = async (path: string) => {
		navigate(path);
		await showWindow();
	};
	// Rebuilding a native menu is comparatively expensive: skip no-op updates.
	let lastSummary = "";

	return {
		async setUrgentSummary(summary: UrgentSummary) {
			const key = JSON.stringify(summary);
			if (key === lastSummary) return;
			lastSummary = key;

			const { count, items } = summary;
			await getCurrentWindow()
				.setBadgeCount(count > 0 ? count : undefined)
				.catch(() => {}); // unsupported on some platforms

			const tray = await TrayIcon.getById(TRAY_ID);
			if (!tray) return;
			await tray.setTitle(count > 0 ? String(count) : null);
			await tray.setTooltip(
				count > 0 ? `${count} urgent` : "Productivity Dashboard",
			);

			const shown = items.slice(0, MAX_MENU_ITEMS);
			const more = items.length - shown.length;
			const menu = await Menu.new({
				items: [
					{
						text:
							count > 0
								? `${count} item${count === 1 ? "" : "s"} need${count === 1 ? "s" : ""} you`
								: "Nothing urgent",
						enabled: false,
					},
					...shown.map((item) => ({
						text: `${truncate(item.title)} — ${item.detail}`,
						action: () => void openExternal(item.url),
					})),
					...(more > 0
						? [
								{
									text: `${more} more…`,
									action: () => void openPage("/urgent"),
								},
							]
						: []),
					{ item: "Separator" as const },
					{ text: "Open Urgent", action: () => void openPage("/urgent") },
					{ text: "Open Dashboard", action: () => void openPage("/") },
					{ item: "Separator" as const },
					{ text: "Quit", action: () => void invoke("quit_app") },
				],
			});
			await tray.setMenu(menu);
		},

		async notificationPermission() {
			return (await isPermissionGranted()) ? "granted" : "default";
		},

		async requestNotificationPermission() {
			if (await isPermissionGranted()) return "granted";
			return requestPermission();
		},

		async notify({ title, body }) {
			if (await isPermissionGranted()) sendNotification({ title, body });
		},

		getLaunchAtLogin: () => isEnabled(),

		setLaunchAtLogin: (enabled) => (enabled ? enable() : disable()),

		showWindow: async () => {
			await showWindow();
		},

		async registerGlobalShortcut(accelerator, onPress) {
			// Re-registering (dev hot reload, StrictMode) must not fail.
			if (await isRegistered(accelerator)) await unregister(accelerator);
			await register(accelerator, (event) => {
				if (event.state === "Pressed") onPress();
			});
			return () => unregister(accelerator);
		},
	};
}
