import { withIntegration } from "#/platform/integration-runner";
import { gmailBackend, gmailService } from "./integration";

export const fetchGmailUnread = () =>
	withIntegration(gmailBackend, (ctx) => gmailService(ctx).unreadInbox());

export const fetchGmailStarred = () =>
	withIntegration(gmailBackend, (ctx) => gmailService(ctx).starred());

export const fetchGmailInboxStats = () =>
	withIntegration(gmailBackend, (ctx) => gmailService(ctx).inboxStats());
