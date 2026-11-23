import { createFileRoute } from "@tanstack/react-router";
import { handleOAuthStart } from "#/features/connections/oauth-handlers.server";

export const Route = createFileRoute("/api/oauth/$provider/start")({
	server: {
		handlers: {
			GET: ({ params }) => handleOAuthStart(params.provider),
		},
	},
});
