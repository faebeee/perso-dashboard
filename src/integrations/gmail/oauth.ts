import "@tanstack/react-start/server-only";
import type { OAuthProvider } from "#/core/oauth";
import type { OAuthClientCredentials } from "#/server/env";
import { createGoogleOAuth } from "#/server/oauth/google";
import { GMAIL_SCOPES } from "./constants";

export const createGmailOAuth = (
	creds: OAuthClientCredentials,
	redirectUri: string,
): OAuthProvider => createGoogleOAuth(creds, redirectUri, GMAIL_SCOPES);
