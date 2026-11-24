import {
	type IntegrationBackend,
	type IntegrationContext,
	rulesOf,
} from "@dashboard/core/integration";
import { MICROSOFT_OAUTH_CLIENT } from "@dashboard/platform/oauth/microsoft";
import { importantMailToAttention, sentActivity } from "../shared/mail-rules";
import { createOutlookApi } from "./api/client";
import { OUTLOOK_ID } from "./constants";
import { mailMetrics } from "./insights";
import { createOutlookOAuth } from "./oauth";
import { createOutlookService } from "./service";
import { unansweredToWaiting } from "./waiting";

export const outlookService = (ctx: IntegrationContext) =>
	createOutlookService(createOutlookApi(ctx.accessToken));

const accountEmail = (ctx: IntegrationContext) =>
	typeof ctx.meta.email === "string" ? ctx.meta.email : undefined;

export const outlookBackend: IntegrationBackend = {
	id: OUTLOOK_ID,

	/** Same Microsoft app registration as Outlook Calendar. */
	oauthClient: MICROSOFT_OAUTH_CLIENT,

	createOAuthProvider: createOutlookOAuth,

	async describeAccount({ accessToken }) {
		const me = await createOutlookApi(accessToken).me();
		const email = me.mail ?? me.userPrincipalName;
		return { label: email, meta: { email } };
	},

	getFeedItems: (ctx) => outlookService(ctx).unreadInbox(),

	getWaitingItems: async (ctx, now) =>
		unansweredToWaiting(
			await outlookService(ctx).recentlySent(rulesOf(ctx).waiting),
			accountEmail(ctx),
			now,
			rulesOf(ctx).waiting,
		),

	getActivity: async (ctx, { from, to }) =>
		sentActivity(await outlookService(ctx).sentBetween(from, to)),

	async getMetrics(ctx, weeks, now) {
		const service = outlookService(ctx);
		const clip = (end: Date) => (end > now ? now : end);
		const perWeek = (folder: "inbox" | "sentitems") =>
			Promise.all(
				weeks.map((w) => service.countBetween(folder, w.start, clip(w.end))),
			);
		const [received, sent] = await Promise.all([
			perWeek("inbox"),
			perWeek("sentitems"),
		]);
		return mailMetrics({ received, sent });
	},

	getRelatedItems: (ctx, { people, since }) =>
		outlookService(ctx).withPeople(people, since),

	getAttentionItems: async (ctx, now) =>
		importantMailToAttention(
			await outlookService(ctx).importantUnread(
				rulesOf(ctx).attention.emailWindowDays,
			),
			now,
		),
};
