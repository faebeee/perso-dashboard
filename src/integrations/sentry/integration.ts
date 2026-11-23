import type {
	IntegrationBackend,
	IntegrationContext,
} from "#/core/integration";
import { createSentryApi } from "./api/client";
import { issuesToAttention } from "./attention";
import { SENTRY_ID } from "./constants";
import { createSentryOAuth, SENTRY_OAUTH_CLIENT } from "./oauth";
import {
	accountLabel,
	createSentryService,
	readSentryMeta,
	resolveSentryAccount,
} from "./service";

export const sentryService = (ctx: IntegrationContext) =>
	createSentryService(
		createSentryApi(ctx.accessToken),
		readSentryMeta(ctx.meta).organizations,
	);

export const sentryBackend: IntegrationBackend = {
	id: SENTRY_ID,

	oauthClient: SENTRY_OAUTH_CLIENT,

	createOAuthProvider: createSentryOAuth,

	async describeAccount({ accessToken }) {
		const meta = await resolveSentryAccount(createSentryApi(accessToken));
		return { label: accountLabel(meta), meta };
	},

	/** Only errors assigned to you personally count as "your work". */
	getFeedItems: (ctx) => sentryService(ctx).assignedToMe(),

	getAttentionItems: async (ctx) =>
		issuesToAttention(await sentryService(ctx).assignedIssues()),
};
