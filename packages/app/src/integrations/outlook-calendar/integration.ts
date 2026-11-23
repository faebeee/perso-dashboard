import {
	type ChoiceListSetting,
	type IntegrationBackend,
	type IntegrationContext,
	rulesOf,
	stringListSetting,
} from "@dashboard/core/integration";
import { MICROSOFT_OAUTH_CLIENT } from "@dashboard/platform/oauth/microsoft";
import { eventsToAttention } from "../shared/calendar-attention";
import { meetingActivity, meetingMetrics } from "../shared/calendar-insights";
import { pendingRepliesToWaiting } from "../shared/calendar-waiting";
import { createOutlookCalendarApi } from "./api/client";
import { DEFAULT_CALENDAR, OUTLOOK_CALENDAR_ID } from "./constants";
import { createOutlookCalendarOAuth } from "./oauth";
import { createOutlookCalendarService } from "./service";

/** Which calendars feed the app (Preferences → Outlook Calendar). */
export const CALENDARS_SETTING: ChoiceListSetting = {
	key: "calendars",
	label: "Calendars",
	description:
		"Events from these calendars appear in your agenda, Today, Urgent, Waiting and Insights.",
	type: "choice-list",
	default: [DEFAULT_CALENDAR],
	minSelected: 1,
};

export const outlookCalendarService = (ctx: IntegrationContext) =>
	createOutlookCalendarService(
		createOutlookCalendarApi(ctx.accessToken),
		undefined,
		{
			calendarIds: stringListSetting(ctx.settings, CALENDARS_SETTING),
			accountEmail:
				typeof ctx.meta.email === "string" ? ctx.meta.email : undefined,
		},
	);

/** No getFeedItems: future events aren't "work" for the newest-first feed. */
export const outlookCalendarBackend: IntegrationBackend = {
	id: OUTLOOK_CALENDAR_ID,

	/** Same Microsoft app registration as Outlook (mail). */
	oauthClient: MICROSOFT_OAUTH_CLIENT,

	settings: [CALENDARS_SETTING],

	loadSettingOptions: async (ctx, key) =>
		key === CALENDARS_SETTING.key
			? outlookCalendarService(ctx).calendarOptions()
			: [],

	createOAuthProvider: createOutlookCalendarOAuth,

	async describeAccount({ accessToken }) {
		const me = await createOutlookCalendarApi(accessToken).me();
		const email = me.mail ?? me.userPrincipalName;
		return { label: email, meta: { email } };
	},

	getWaitingItems: async (ctx, now) =>
		pendingRepliesToWaiting(
			await outlookCalendarService(ctx).between(
				now,
				new Date(
					now.getTime() +
						rulesOf(ctx).waiting.invitationWindowDays * 86_400_000,
				),
			),
		),

	getActivity: async (ctx, { from, to }) =>
		meetingActivity(
			await outlookCalendarService(ctx).between(from, to, 250),
			from,
			to,
			OUTLOOK_CALENDAR_ID,
		),

	getMetrics: async (ctx, weeks, now) =>
		meetingMetrics(
			await outlookCalendarService(ctx).between(
				weeks[0]?.start ?? now,
				now,
				1000, // one page: six weeks of meetings fit
			),
			weeks,
			now,
			OUTLOOK_CALENDAR_ID,
		),

	getAgenda: (ctx, { from, to }) =>
		outlookCalendarService(ctx).between(from, to),

	getAttentionItems: async (ctx, now) =>
		eventsToAttention(
			await outlookCalendarService(ctx).upcoming("all"),
			now,
			rulesOf(ctx).attention,
		),
};
