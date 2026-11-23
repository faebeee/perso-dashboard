import { withIntegration } from "#/platform/integration-runner";
import { outlookBackend, outlookService } from "./integration";

export const fetchOutlookUnread = () =>
	withIntegration(outlookBackend, (ctx) => outlookService(ctx).unreadInbox());

export const fetchOutlookFlagged = () =>
	withIntegration(outlookBackend, (ctx) => outlookService(ctx).flagged());

export const fetchOutlookMessage = (id: string) =>
	withIntegration(outlookBackend, (ctx) => outlookService(ctx).message(id));

export const fetchOutlookInboxStats = () =>
	withIntegration(outlookBackend, (ctx) => outlookService(ctx).inboxStats());
