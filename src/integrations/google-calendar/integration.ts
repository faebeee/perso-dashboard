import {
	type ChoiceListSetting,
	type IntegrationBackend,
	type IntegrationContext,
	rulesOf,
	stringListSetting,
} from "#/core/integration";
import { GOOGLE_OAUTH_CLIENT } from "#/platform/oauth/google";
import { eventsToAttention } from "../shared/calendar-attention";
import { meetingActivity, meetingMetrics } from "../shared/calendar-insights";
import { pendingRepliesToWaiting } from "../shared/calendar-waiting";
import { createGoogleCalendarApi } from "./api/client";
import { GOOGLE_CALENDAR_ID } from "./constants";
import { createGoogleCalendarOAuth } from "./oauth";
import { createGoogleCalendarService } from "./service";

/** Which calendars feed the app (Preferences → Google Calendar). */
export const CALENDARS_SETTING: ChoiceListSetting = {
	key: "calendars",
	label: "Calendars",
	description:
		"Events from these calendars appear in your agenda, Today, Urgent, Waiting and Insights.",
	type: "choice-list",
	default: ["primary"],
	minSelected: 1,
};

export const googleCalendarService = (ctx: IntegrationContext) =>
	createGoogleCalendarService(
		createGoogleCalendarApi(ctx.accessToken),
		undefined,
		{
			calendarIds: stringListSetting(ctx.settings, CALENDARS_SETTING),
		},
	);

/** No getFeedItems: future events aren't "work" for the newest-first feed. */
export const googleCalendarBackend: IntegrationBackend = {
	id: GOOGLE_CALENDAR_ID,

	/** Same Google OAuth client as Gmail. */
	oauthClient: GOOGLE_OAUTH_CLIENT,

	settings: [CALENDARS_SETTING],

	loadSettingOptions: async (ctx, key) =>
		key === CALENDARS_SETTING.key
			? googleCalendarService(ctx).calendarOptions()
			: [],

	createOAuthProvider: createGoogleCalendarOAuth,

	async describeAccount({ accessToken }) {
		const calendar =
			await createGoogleCalendarApi(accessToken).primaryCalendar();
		return { label: calendar.id, meta: { email: calendar.id } };
	},

	getWaitingItems: async (ctx, now) =>
		pendingRepliesToWaiting(
			await googleCalendarService(ctx).between(
				now,
				new Date(
					now.getTime() +
						rulesOf(ctx).waiting.invitationWindowDays * 86_400_000,
				),
			),
		),

	getActivity: async (ctx, { from, to }) =>
		meetingActivity(
			await googleCalendarService(ctx).between(from, to, 250),
			from,
			to,
			GOOGLE_CALENDAR_ID,
		),

	getMetrics: async (ctx, weeks, now) =>
		meetingMetrics(
			await googleCalendarService(ctx).between(
				weeks[0]?.start ?? now,
				now,
				2500, // Google's maximum: six weeks of meetings fit
			),
			weeks,
			now,
			GOOGLE_CALENDAR_ID,
		),

	getAgenda: (ctx, { from, to }) =>
		googleCalendarService(ctx).between(from, to),

	getAttentionItems: async (ctx, now) =>
		eventsToAttention(
			await googleCalendarService(ctx).upcoming("all"),
			now,
			rulesOf(ctx).attention,
		),
};
