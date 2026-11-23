import { createFileRoute } from "@tanstack/react-router";
import { handleOAuthCallback } from "#/features/connections/oauth-handlers.server";

export const Route = createFileRoute("/api/oauth/$provider/callback")({
	server: {
		handlers: {
			GET: ({ params, request }) =>
				handleOAuthCallback(params.provider, request),
		},
	},
});
