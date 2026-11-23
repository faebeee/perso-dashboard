import type {
	IntegrationBackend,
	IntegrationContext,
} from "#/core/integration";
import { GOOGLE_OAUTH_CLIENT } from "#/platform/oauth/google";
import { createGmailApi } from "./api/client";
import { importantMailToAttention } from "./attention";
import { GMAIL_ID } from "./constants";
import { insightQueries, mailMetrics, sentActivity } from "./insights";
import { createGmailOAuth } from "./oauth";
import { createGmailService } from "./service";
import { unansweredToWaiting } from "./waiting";

export const gmailService = (ctx: IntegrationContext) =>
	createGmailService(
		createGmailApi(ctx.accessToken),
		typeof ctx.meta.email === "string" ? ctx.meta.email : undefined,
	);

export const gmailBackend: IntegrationBackend = {
	id: GMAIL_ID,

	oauthClient: GOOGLE_OAUTH_CLIENT,

	createOAuthProvider: createGmailOAuth,

	async describeAccount({ accessToken }) {
		const profile = await createGmailApi(accessToken).profile();
		return {
			label: profile.emailAddress,
			meta: { email: profile.emailAddress },
		};
	},

	getFeedItems: (ctx) => gmailService(ctx).unreadInbox(),

	getWaitingItems: async (ctx, now) =>
		unansweredToWaiting(
			await gmailService(ctx).recentlySentThreads(),
			typeof ctx.meta.email === "string" ? ctx.meta.email : undefined,
			now,
		),

	getActivity: async (ctx, { from, to }) =>
		sentActivity(await gmailService(ctx).sentBetween(from, to)),

	async getMetrics(ctx, weeks, now) {
		const service = gmailService(ctx);
		const clip = (end: Date) => (end > now ? now : end);
		const perWeek = (query: (from: Date, to: Date) => string) =>
			Promise.all(
				weeks.map((w) => service.estimate(query(w.start, clip(w.end)))),
			);
		const [received, sent] = await Promise.all([
			perWeek(insightQueries.received),
			perWeek(insightQueries.sent),
		]);
		return mailMetrics({ received, sent });
	},

	getRelatedToPeople: (ctx, people, since) =>
		gmailService(ctx).withPeople(people, since),

	getAttentionItems: async (ctx, now) =>
		importantMailToAttention(await gmailService(ctx).importantUnread(), now),
};
