import { type IntegrationBackend, rulesOf } from "#/core/integration";
import { GOOGLE_OAUTH_CLIENT } from "#/platform/oauth/google";
import { createGoogleCalendarApi } from "./api/client";
import { eventsToAttention } from "./attention";
import { GOOGLE_CALENDAR_ID } from "./constants";
import { meetingActivity, meetingMetrics } from "./insights";
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

	getWaitingItems: async (ctx, now) =>
		pendingRepliesToWaiting(
			await googleCalendarService(ctx.accessToken).between(
				now,
				new Date(
					now.getTime() +
						rulesOf(ctx).waiting.invitationWindowDays * 86_400_000,
				),
			),
		),

	getActivity: async ({ accessToken }, { from, to }) =>
		meetingActivity(
			await googleCalendarService(accessToken).between(from, to, 250),
			from,
			to,
		),

	getMetrics: async ({ accessToken }, weeks, now) =>
		meetingMetrics(
			await googleCalendarService(accessToken).between(
				weeks[0]?.start ?? now,
				now,
				2500, // Google's maximum: six weeks of meetings fit
			),
			weeks,
			now,
		),

	getAgenda: ({ accessToken }, { from, to }) =>
		googleCalendarService(accessToken).between(from, to),

	getAttentionItems: async (ctx, now) =>
		eventsToAttention(
			await googleCalendarService(ctx.accessToken).upcoming("all"),
			now,
			rulesOf(ctx).attention,
		),
};
