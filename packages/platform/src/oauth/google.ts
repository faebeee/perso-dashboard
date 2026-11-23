import type { SetupGuide } from "@dashboard/core/integration";
import type {
	OAuthClientCredentials,
	OAuthProvider,
} from "@dashboard/core/oauth";
import { createOAuth2Provider } from "./oauth2-client";

/** Shared by every Google-based integration so they don't import each other. */
export const GOOGLE_OAUTH_CLIENT = {
	id: "google",
	label: "Google OAuth client",
} as const;

/**
 * Google OAuth for installed apps: PKCE + loopback redirect + offline access.
 * Use a "Desktop app" OAuth client, which accepts any 127.0.0.1 port.
 */
export function createGoogleOAuth(
	credentials: OAuthClientCredentials,
	redirectUri: string,
	scopes: string[],
): OAuthProvider {
	return createOAuth2Provider({
		authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
		tokenEndpoint: "https://oauth2.googleapis.com/token",
		credentials,
		redirectUri,
		scopes,
		pkce: true,
		authorizationParams: {
			access_type: "offline",
			// Always show consent so Google re-issues a refresh token on reconnect.
			prompt: "consent",
		},
	});
}

/** Shared by Gmail and Google Calendar: one OAuth client serves both. */
export const GOOGLE_SETUP_GUIDE: SetupGuide = {
	steps: [
		{
			title: "Create or pick a Google Cloud project",
			text: "Any project works; a new one keeps things tidy.",
			links: [
				{
					label: "Create project",
					url: "https://console.cloud.google.com/projectcreate",
				},
			],
		},
		{
			title: "Enable the Gmail and Calendar APIs",
			text: "Enable both, even if you only use one: Gmail and Google Calendar share this OAuth client.",
			links: [
				{
					label: "Gmail API",
					url: "https://console.cloud.google.com/apis/library/gmail.googleapis.com",
				},
				{
					label: "Google Calendar API",
					url: "https://console.cloud.google.com/apis/library/calendar-json.googleapis.com",
				},
			],
		},
		{
			title: "Set up the consent screen",
			text: "In Google Auth Platform, fill in Branding (app name, your email). Under Audience choose External, keep it in Testing, and add your Google account as a test user.",
			links: [
				{
					label: "Google Auth Platform",
					url: "https://console.cloud.google.com/auth/overview",
				},
			],
		},
		{
			title: "Create a Desktop app client",
			text: "Open Clients → Create client and choose the application type “Desktop app”. Desktop clients accept this app's local redirect automatically, so there's no URL to register.",
			links: [
				{
					label: "Create client",
					url: "https://console.cloud.google.com/auth/clients/create",
				},
			],
		},
		{
			title: "Copy the credentials",
			text: "Copy the Client ID and Client secret shown after creating the client.",
		},
	],
};
