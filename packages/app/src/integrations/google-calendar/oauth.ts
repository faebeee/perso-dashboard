import type {
	OAuthClientCredentials,
	OAuthProvider,
} from "@dashboard/core/oauth";
import { createGoogleOAuth } from "@dashboard/platform/oauth/google";
import { GOOGLE_CALENDAR_SCOPES } from "./constants";

export const createGoogleCalendarOAuth = (
	credentials: OAuthClientCredentials,
	redirectUri: string,
): OAuthProvider =>
	createGoogleOAuth(credentials, redirectUri, GOOGLE_CALENDAR_SCOPES);
