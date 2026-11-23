import {
	queryOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { integrationQueryKey, queryKeys } from "#/lib/query-keys";
import { disconnectIntegration, fetchIntegrationStatuses } from "./server-fns";

export const connectionQueries = {
	statuses: () =>
		queryOptions({
			queryKey: queryKeys.connections,
			queryFn: () => fetchIntegrationStatuses(),
		}),
};

export function useDisconnectIntegration() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (integrationId: string) =>
			disconnectIntegration({ data: { integrationId } }),
		onSuccess: (_, integrationId) =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: queryKeys.connections }),
				queryClient.invalidateQueries({ queryKey: queryKeys.combined }),
				queryClient.resetQueries({
					queryKey: integrationQueryKey(integrationId),
				}),
			]),
	});
}

/** URL of the server route that starts the OAuth flow. */
export const connectUrl = (integrationId: string) =>
	`/api/oauth/${encodeURIComponent(integrationId)}/start`;
