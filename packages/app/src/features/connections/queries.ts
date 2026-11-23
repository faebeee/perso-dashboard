import type { OAuthClientCredentials } from "@dashboard/core/oauth";
import {
	queryOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { integrationQueryKey, queryKeys } from "#/lib/query-keys";
import {
	cancelConnect,
	connectIntegration,
	disconnectIntegration,
	fetchIntegrationStatuses,
	saveOAuthClient,
} from "./fetchers";

export const connectionQueries = {
	statuses: () =>
		queryOptions({
			queryKey: queryKeys.connections,
			queryFn: () => fetchIntegrationStatuses(),
		}),
};

/** Refetch everything that depends on an integration's connection state. */
function useRefreshIntegration() {
	const queryClient = useQueryClient();
	return (integrationIds: string[]) =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: queryKeys.connections }),
			queryClient.invalidateQueries({ queryKey: queryKeys.combined }),
			...integrationIds.map((id) =>
				queryClient.resetQueries({ queryKey: integrationQueryKey(id) }),
			),
		]);
}

export function useConnectIntegration(integrationId: string) {
	const refresh = useRefreshIntegration();
	const mutation = useMutation({
		mutationFn: () => connectIntegration(integrationId),
		onSuccess: () => refresh([integrationId]),
	});
	return { ...mutation, cancel: cancelConnect };
}

export function useDisconnectIntegration() {
	const refresh = useRefreshIntegration();
	return useMutation({
		mutationFn: (integrationId: string) => disconnectIntegration(integrationId),
		onSuccess: (_, integrationId) => refresh([integrationId]),
	});
}

export function useSaveOAuthClient(input: {
	oauthClientId: string;
	/** Every integration using this client, so their widgets reload. */
	integrationIds: string[];
}) {
	const refresh = useRefreshIntegration();
	return useMutation({
		mutationFn: (credentials: OAuthClientCredentials) =>
			saveOAuthClient(input.oauthClientId, credentials),
		onSuccess: () => refresh(input.integrationIds),
	});
}
