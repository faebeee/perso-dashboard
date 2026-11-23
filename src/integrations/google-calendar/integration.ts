import type { IntegrationBackend } from "#/core/integration";
import { WAITING_RULES } from "#/core/waiting";
import { GOOGLE_OAUTH_CLIENT } from "#/platform/oauth/google";
import { createGoogleCalendarApi } from "./api/client";
import { eventsToAttention } from "./attention";
import { GOOGLE_CALENDAR_ID } from "./constants";
import { createGoogleCalendarOAuth } from "./oauth";
import { createGoogleCalendarService } from "./service";
import { pendingRepliesToWaiting } from "./waiting";

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

	getWaitingItems: async ({ accessToken }, now) =>
		pendingRepliesToWaiting(
			await googleCalendarService(accessToken).between(
				now,
				new Date(
					now.getTime() + WAITING_RULES.invitationWindowDays * 86_400_000,
				),
			),
		),

	getAgenda: ({ accessToken }, { from, to }) =>
		googleCalendarService(accessToken).between(from, to),

	getAttentionItems: async ({ accessToken }, now) =>
		eventsToAttention(
			await googleCalendarService(accessToken).upcoming("all"),
			now,
		),
};
