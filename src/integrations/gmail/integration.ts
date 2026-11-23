import type {
	IntegrationBackend,
	IntegrationContext,
} from "#/core/integration";
import { GOOGLE_OAUTH_CLIENT } from "#/platform/oauth/google";
import { createGmailApi } from "./api/client";
import { GMAIL_ID } from "./constants";
import { createGmailOAuth } from "./oauth";
import { createGmailService } from "./service";

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
};
