import type {
	OAuthClientCredentials,
	OAuthProvider,
} from "@dashboard/core/oauth";
import { createGoogleOAuth } from "@dashboard/platform/oauth/google";
import { GMAIL_SCOPES } from "./constants";

export const createGmailOAuth = (
	credentials: OAuthClientCredentials,
	redirectUri: string,
): OAuthProvider => createGoogleOAuth(credentials, redirectUri, GMAIL_SCOPES);
