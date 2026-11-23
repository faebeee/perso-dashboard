import type { WorkScope } from "@dashboard/core/work-scope";
import { withIntegration } from "@dashboard/platform/integration-runner";
import { outlookCalendarBackend, outlookCalendarService } from "./integration";

export const fetchOutlookEvent = (ref: string) =>
	withIntegration(outlookCalendarBackend, (ctx) =>
		outlookCalendarService(ctx).eventDetail(ref),
	);

export const fetchOutlookUpcomingEvents = (scope: WorkScope) =>
	withIntegration(outlookCalendarBackend, (ctx) =>
		outlookCalendarService(ctx).upcoming(scope),
	);
