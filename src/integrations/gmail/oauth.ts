import type { OAuthClientCredentials, OAuthProvider } from "#/core/oauth";
import { createGoogleOAuth } from "#/platform/oauth/google";
import { GMAIL_SCOPES } from "./constants";

export const createGmailOAuth = (
	credentials: OAuthClientCredentials,
	redirectUri: string,
): OAuthProvider => createGoogleOAuth(credentials, redirectUri, GMAIL_SCOPES);
