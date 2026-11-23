import { createServerFn } from "@tanstack/react-start";
import { withIntegration } from "#/server/integration-runner";
import { gmailServer, gmailService } from "./integration.server";

export const fetchGmailUnread = createServerFn({ method: "GET" }).handler(() =>
	withIntegration(gmailServer, (ctx) => gmailService(ctx).unreadInbox()),
);
