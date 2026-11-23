import "@tanstack/react-start/server-only";
import type { IntegrationContext, IntegrationServer } from "#/core/integration";
import { readOAuthClient, requireOAuthClient } from "#/server/env";
import { createGmailApi } from "./api/client";
import { GMAIL_ID } from "./constants";
import { createGmailOAuth } from "./oauth";
import { createGmailService } from "./service";

const ENV_PREFIX = "GOOGLE";

export const gmailService = (ctx: IntegrationContext) =>
	createGmailService(
		createGmailApi(ctx.accessToken),
		typeof ctx.meta.email === "string" ? ctx.meta.email : undefined,
	);

export const gmailServer: IntegrationServer = {
	id: GMAIL_ID,

	isConfigured: () => readOAuthClient(ENV_PREFIX) !== null,

	createOAuthProvider: (redirectUri) =>
		createGmailOAuth(requireOAuthClient(ENV_PREFIX), redirectUri),

	async describeAccount({ accessToken }) {
		const profile = await createGmailApi(accessToken).profile();
		return {
			label: profile.emailAddress,
			meta: { email: profile.emailAddress },
		};
	},

	getFeedItems: (ctx) => gmailService(ctx).unreadInbox(),
};
