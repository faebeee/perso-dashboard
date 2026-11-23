import "@tanstack/react-start/server-only";
import type { OAuthProvider } from "#/core/oauth";
import type { OAuthClientCredentials } from "#/server/env";
import { createGoogleOAuth } from "#/server/oauth/google";
import { GOOGLE_CALENDAR_SCOPES } from "./constants";

export const createGoogleCalendarOAuth = (
	creds: OAuthClientCredentials,
	redirectUri: string,
): OAuthProvider =>
	createGoogleOAuth(creds, redirectUri, GOOGLE_CALENDAR_SCOPES);
