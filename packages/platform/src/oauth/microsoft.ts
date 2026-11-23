import {
	REDIRECT_URI_PLACEHOLDER,
	type SetupGuide,
} from "@dashboard/core/integration";
import type {
	OAuthClientCredentials,
	OAuthClientRef,
	OAuthProvider,
} from "@dashboard/core/oauth";
import { createOAuth2Provider } from "./oauth2-client";

/**
 * Shared by every Microsoft-based integration (Outlook mail and calendar)
 * so they don't import each other. A "Mobile and desktop" app registration
 * is a public client: Microsoft rejects a client secret from it, and it only
 * accepts an `http://localhost` redirect URI entered in the portal.
 */
export const MICROSOFT_OAUTH_CLIENT: OAuthClientRef = {
	id: "microsoft",
	label: "Microsoft app registration",
	publicClient: true,
	redirectHost: "localhost",
	sharedRedirectUri: true,
};

/** Work, school and personal accounts (needs a multitenant registration). */
const AUTHORITY = "https://login.microsoftonline.com/common/oauth2/v2.0";

/** Refresh tokens and your profile; added to every integration's scopes. */
const BASE_SCOPES = ["offline_access", "User.Read"];

/** Microsoft identity platform: auth code + PKCE, no secret (public client). */
export function createMicrosoftOAuth(
	credentials: OAuthClientCredentials,
	redirectUri: string,
	scopes: string[],
): OAuthProvider {
	return createOAuth2Provider({
		authorizationEndpoint: `${AUTHORITY}/authorize`,
		tokenEndpoint: `${AUTHORITY}/token`,
		// Public client: never send a secret, even if one was stored.
		credentials: { clientId: credentials.clientId, clientSecret: "" },
		redirectUri,
		scopes: [...new Set([...BASE_SCOPES, ...scopes])],
		pkce: true,
		// Lets you pick the right account when several are signed in.
		authorizationParams: { prompt: "select_account" },
	});
}

/** Shared by Outlook and Outlook Calendar: one app registration serves both. */
export const MICROSOFT_SETUP_GUIDE: SetupGuide = {
	steps: [
		{
			title: "Register an app",
			text: "In the Microsoft Entra admin center, open App registrations → New registration. Any name works.\n\nUnder Supported account types choose “Accounts in any organizational directory and personal Microsoft accounts”. This app signs in through the common endpoint, so it works for work, school and personal Outlook accounts.",
			links: [
				{
					label: "New registration",
					url: "https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/CreateApplicationBlade",
				},
			],
		},
		{
			title: "Add the redirect URI",
			text: "Still on the registration form (or later under Authentication → Add a platform), pick the platform “Public client/native (mobile & desktop)” and enter this redirect URI exactly. Outlook and Outlook Calendar both use it.\n\nDon't create a client secret: desktop apps sign in without one.",
			copy: [{ label: "Redirect URI", value: REDIRECT_URI_PLACEHOLDER }],
		},
		{
			title: "Check the permissions",
			text: "Under API permissions, add Microsoft Graph delegated permissions: User.Read, Mail.Read, Calendars.Read, Calendars.Read.Shared and offline_access. They're read-only; you'll be asked to consent when connecting.\n\nWork or school accounts: if your organization blocks user consent, an admin has to click “Grant admin consent” here.",
		},
		{
			title: "Copy the client ID",
			text: "On the app's Overview page, copy the Application (client) ID.",
		},
	],
};
