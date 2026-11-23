import type { OAuthClientCredentials, OAuthProvider } from "#/core/oauth";
import { createMicrosoftOAuth } from "#/platform/oauth/microsoft";
import { OUTLOOK_CALENDAR_SCOPES } from "./constants";

export const createOutlookCalendarOAuth = (
	credentials: OAuthClientCredentials,
	redirectUri: string,
): OAuthProvider =>
	createMicrosoftOAuth(credentials, redirectUri, OUTLOOK_CALENDAR_SCOPES);
