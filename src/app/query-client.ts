import { QueryClient } from "@tanstack/react-query";
import { IntegrationFailure } from "#/core/result";

/** Errors that retrying won't fix. */
const PERMANENT = new Set(["not_configured", "not_connected", "unauthorized"]);

export function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 60_000,
				refetchInterval: 5 * 60_000,
				refetchOnWindowFocus: true,
				retry: (failureCount, error) =>
					!(
						error instanceof IntegrationFailure &&
						PERMANENT.has(error.error.kind)
					) && failureCount < 2,
			},
		},
	});
}
