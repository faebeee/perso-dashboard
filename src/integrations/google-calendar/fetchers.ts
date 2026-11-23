import type { WorkScope } from "#/core/work-scope";
import { withIntegration } from "#/platform/integration-runner";
import { googleCalendarBackend, googleCalendarService } from "./integration";

export const fetchCalendarEvent = (id: string) =>
	withIntegration(googleCalendarBackend, (ctx) =>
		googleCalendarService(ctx.accessToken).eventDetail(id),
	);

export const fetchUpcomingEvents = (scope: WorkScope) =>
	withIntegration(googleCalendarBackend, (ctx) =>
		googleCalendarService(ctx.accessToken).upcoming(scope),
	);
