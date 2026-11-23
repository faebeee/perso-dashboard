import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useId, useSyncExternalStore } from "react";
import { Button } from "#/components/ui/button";
import { Switch } from "#/components/ui/switch";
import { preferences } from "#/platform/preferences";
import {
	preferenceQueries,
	useRequestNotificationPermission,
	useSetLaunchAtLogin,
} from "../queries";

export function PreferencesPage() {
	const prefs = useSyncExternalStore(preferences.subscribe, preferences.get);
	const launchAtLogin = useQuery(preferenceQueries.launchAtLogin());
	const setLaunchAtLogin = useSetLaunchAtLogin();
	const permission = useQuery(preferenceQueries.notificationPermission());
	const requestPermission = useRequestNotificationPermission();

	const toggleNotifications = (enabled: boolean) => {
		preferences.set("notifications", enabled);
		if (enabled && permission.data !== "granted") requestPermission.mutate();
	};

	return (
		<div className="max-w-2xl divide-y rounded-xl border bg-card shadow-xs">
			<Row
				title="Open at login"
				description="Start the dashboard in the background when you log in, so the menu bar count and notifications are always there."
				control={(id) => (
					<Switch
						id={id}
						checked={launchAtLogin.data ?? false}
						disabled={launchAtLogin.isPending || setLaunchAtLogin.isPending}
						onCheckedChange={(enabled) => setLaunchAtLogin.mutate(enabled)}
					/>
				)}
				error={setLaunchAtLogin.error?.message}
			/>
			<Row
				title="Notify me about urgent items"
				description="A desktop notification when something becomes urgent: a meeting about to start, a new review request, an overdue issue. Each item notifies once (again if it escalates)."
				control={(id) => (
					<Switch
						id={id}
						checked={prefs.notifications}
						onCheckedChange={toggleNotifications}
					/>
				)}
			>
				{prefs.notifications &&
					permission.data &&
					permission.data !== "granted" && (
						<div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
							<span>
								{permission.data === "denied"
									? "Notifications are blocked. Allow them in System Settings → Notifications."
									: "The app isn't allowed to show notifications yet."}
							</span>
							{permission.data !== "denied" && (
								<Button
									size="sm"
									variant="outline"
									className="h-7"
									disabled={requestPermission.isPending}
									onClick={() => requestPermission.mutate()}
								>
									Allow notifications
								</Button>
							)}
						</div>
					)}
			</Row>
			<div className="p-4 text-xs text-muted-foreground">
				Closing the window keeps the app running in the menu bar. Quit with{" "}
				<kbd className="rounded border px-1">⌘Q</kbd> or from the menu bar icon.
				Press <kbd className="rounded border px-1">⌘K</kbd> anywhere to search.
			</div>
		</div>
	);
}

function Row({
	title,
	description,
	control,
	error,
	children,
}: {
	title: string;
	description: string;
	control: (id: string) => ReactNode;
	error?: string;
	children?: ReactNode;
}) {
	const id = useId();
	return (
		<div className="flex items-start gap-4 p-4">
			<div className="min-w-0 flex-1">
				<label htmlFor={id} className="text-sm font-medium">
					{title}
				</label>
				<p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
				{error && <p className="mt-1 text-xs text-destructive">{error}</p>}
				{children}
			</div>
			<div className="pt-0.5">{control(id)}</div>
		</div>
	);
}
