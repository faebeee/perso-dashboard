import "@tanstack/react-start/server-only";
import type { IntegrationServer } from "#/core/integration";
import { readOAuthClient, requireOAuthClient } from "#/server/env";
import { createGoogleCalendarApi } from "./api/client";
import { GOOGLE_CALENDAR_ID } from "./constants";
import { createGoogleCalendarOAuth } from "./oauth";
import { createGoogleCalendarService } from "./service";

/** Same Google OAuth client as Gmail. */
const ENV_PREFIX = "GOOGLE";

export const googleCalendarService = (accessToken: string) =>
	createGoogleCalendarService(createGoogleCalendarApi(accessToken));

/** No getFeedItems: future events aren't "work" for the newest-first feed. */
export const googleCalendarServer: IntegrationServer = {
	id: GOOGLE_CALENDAR_ID,

	isConfigured: () => readOAuthClient(ENV_PREFIX) !== null,

	createOAuthProvider: (redirectUri) =>
		createGoogleCalendarOAuth(requireOAuthClient(ENV_PREFIX), redirectUri),

	async describeAccount({ accessToken }) {
		const calendar =
			await createGoogleCalendarApi(accessToken).primaryCalendar();
		return { label: calendar.id, meta: { email: calendar.id } };
	},
};
