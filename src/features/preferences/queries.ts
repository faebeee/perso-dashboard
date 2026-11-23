import {
	queryOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { getHost } from "#/platform/host";

const keys = {
	launchAtLogin: ["preferences", "launch-at-login"] as const,
	notificationPermission: ["preferences", "notification-permission"] as const,
};

/** OS-owned settings: always read from the OS, never cached as app data. */
export const preferenceQueries = {
	launchAtLogin: () =>
		queryOptions({
			queryKey: keys.launchAtLogin,
			queryFn: () => getHost().desktop.getLaunchAtLogin(),
			staleTime: 0,
			refetchInterval: false,
		}),
	notificationPermission: () =>
		queryOptions({
			queryKey: keys.notificationPermission,
			queryFn: () => getHost().desktop.notificationPermission(),
			staleTime: 0,
			refetchInterval: false,
		}),
};

export function useSetLaunchAtLogin() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (enabled: boolean) =>
			getHost().desktop.setLaunchAtLogin(enabled),
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: keys.launchAtLogin }),
	});
}

export function useRequestNotificationPermission() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => getHost().desktop.requestNotificationPermission(),
		onSuccess: (permission) =>
			queryClient.setQueryData(keys.notificationPermission, permission),
	});
}
