import type {
	OAuthClientCredentials,
	OAuthProvider,
} from "@dashboard/core/oauth";
import { createMicrosoftOAuth } from "@dashboard/platform/oauth/microsoft";
import { OUTLOOK_SCOPES } from "./constants";

export const createOutlookOAuth = (
	credentials: OAuthClientCredentials,
	redirectUri: string,
): OAuthProvider =>
	createMicrosoftOAuth(credentials, redirectUri, OUTLOOK_SCOPES);
