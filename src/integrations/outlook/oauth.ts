import type { OAuthClientCredentials, OAuthProvider } from "#/core/oauth";
import { createMicrosoftOAuth } from "#/platform/oauth/microsoft";
import { OUTLOOK_SCOPES } from "./constants";

export const createOutlookOAuth = (
	credentials: OAuthClientCredentials,
	redirectUri: string,
): OAuthProvider =>
	createMicrosoftOAuth(credentials, redirectUri, OUTLOOK_SCOPES);
