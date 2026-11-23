import type { IntegrationBackend } from "#/core/integration";
import { GOOGLE_OAUTH_CLIENT } from "#/platform/oauth/google";
import { createGoogleCalendarApi } from "./api/client";
import { GOOGLE_CALENDAR_ID } from "./constants";
import { createGoogleCalendarOAuth } from "./oauth";
import { createGoogleCalendarService } from "./service";

export const googleCalendarService = (accessToken: string) =>
	createGoogleCalendarService(createGoogleCalendarApi(accessToken));

/** No getFeedItems: future events aren't "work" for the newest-first feed. */
export const googleCalendarBackend: IntegrationBackend = {
	id: GOOGLE_CALENDAR_ID,

	/** Same Google OAuth client as Gmail. */
	oauthClient: GOOGLE_OAUTH_CLIENT,

	createOAuthProvider: createGoogleCalendarOAuth,

	async describeAccount({ accessToken }) {
		const calendar =
			await createGoogleCalendarApi(accessToken).primaryCalendar();
		return { label: calendar.id, meta: { email: calendar.id } };
	},
};
