import { createServerFn } from "@tanstack/react-start";
import { scopedInputSchema } from "#/core/work-scope";
import { withIntegration } from "#/server/integration-runner";
import {
	googleCalendarServer,
	googleCalendarService,
} from "./integration.server";

export const fetchUpcomingEvents = createServerFn({ method: "GET" })
	.validator(scopedInputSchema)
	.handler(({ data }) =>
		withIntegration(googleCalendarServer, (ctx) =>
			googleCalendarService(ctx.accessToken).upcoming(data.scope),
		),
	);
