import { withIntegration } from "@dashboard/platform/integration-runner";
import { gmailBackend, gmailService } from "./integration";

export const fetchGmailUnread = () =>
	withIntegration(gmailBackend, (ctx) => gmailService(ctx).unreadInbox());

export const fetchGmailStarred = () =>
	withIntegration(gmailBackend, (ctx) => gmailService(ctx).starred());

export const fetchGmailMessage = (id: string) =>
	withIntegration(gmailBackend, (ctx) => gmailService(ctx).message(id));

export const fetchGmailInboxStats = () =>
	withIntegration(gmailBackend, (ctx) => gmailService(ctx).inboxStats());
