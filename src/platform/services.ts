import type { IntegrationBackend } from "#/core/integration";
import type { OAuthProvider } from "#/core/oauth";
import { createAesGcmCipher } from "./crypto";
import { createDatabase } from "./db/client";
import { getHost, type Host } from "./host";
import { createTokenManager, type TokenManager } from "./oauth/token-manager";
import {
	type ConnectionRepository,
	createDrizzleConnectionRepository,
} from "./repositories/connection-repository";
import {
	createDrizzleDismissalRepository,
	type DismissalRepository,
} from "./repositories/dismissal-repository";
import {
	createDrizzleLayoutRepository,
	type LayoutRepository,
} from "./repositories/layout-repository";
import {
	createDrizzleOAuthClientRepository,
	type OAuthClientRepository,
} from "./repositories/oauth-client-repository";
import {
	createDrizzleTodayRepository,
	type TodayRepository,
} from "./repositories/today-repository";

/**
 * Fixed loopback port for OAuth redirects. Providers like Atlassian match the
 * redirect URI exactly, so it has to be stable. Changing it means updating
 * the redirect URIs registered in every OAuth app.
 */
export const OAUTH_LOOPBACK_PORT = 47390;

/** Give up waiting for the browser after this long. */
const OAUTH_TIMEOUT_SECONDS = 5 * 60;

/**
 * Composition root for everything that touches storage, secrets or the
 * network. Swapping an implementation (another database, another host) is a
 * change here, not in features or integrations.
 */
export interface Services {
	connections: ConnectionRepository;
	oauthClients: OAuthClientRepository;
	layouts: LayoutRepository;
	dismissals: DismissalRepository;
	today: TodayRepository;
	tokenManager: TokenManager;
	/** Redirect URI to register in the provider's OAuth app. */
	oauthCallbackUrl(integrationId: string): string;
	/** null when the user hasn't entered this integration's OAuth client yet. */
	oauthProvider(integration: IntegrationBackend): Promise<OAuthProvider | null>;
	/** Runs the browser half of the OAuth flow for one integration. */
	authorizeInBrowser(integrationId: string, url: URL): Promise<URL>;
	cancelAuthorization(): Promise<void>;
}

const callbackPath = (integrationId: string) =>
	`/oauth/${encodeURIComponent(integrationId)}/callback`;

export async function createServices(host: Host): Promise<Services> {
	const [driver, key] = await Promise.all([
		host.openDatabase(),
		host.loadEncryptionKey(),
	]);
	const db = await createDatabase(driver);
	const cipher = await createAesGcmCipher(key);
	const connections = createDrizzleConnectionRepository(db, cipher);
	const oauthClients = createDrizzleOAuthClientRepository(db, cipher);

	const oauthCallbackUrl = (integrationId: string) =>
		`http://127.0.0.1:${OAUTH_LOOPBACK_PORT}${callbackPath(integrationId)}`;

	const oauthProvider = async (integration: IntegrationBackend) => {
		const credentials = await oauthClients.get(integration.oauthClient.id);
		return credentials
			? integration.createOAuthProvider(
					credentials,
					oauthCallbackUrl(integration.id),
				)
			: null;
	};

	return {
		connections,
		oauthClients,
		layouts: createDrizzleLayoutRepository(db),
		dismissals: createDrizzleDismissalRepository(db),
		today: createDrizzleTodayRepository(db),
		tokenManager: createTokenManager({
			connections,
			resolveProvider: oauthProvider,
		}),
		oauthCallbackUrl,
		oauthProvider,
		authorizeInBrowser: (integrationId, url) =>
			host.authorizeInBrowser({
				url,
				port: OAUTH_LOOPBACK_PORT,
				callbackPath: callbackPath(integrationId),
				timeoutSeconds: OAUTH_TIMEOUT_SECONDS,
			}),
		cancelAuthorization: () => host.cancelAuthorization(),
	};
}

let instance: Promise<Services> | undefined;

/** Lazily initialized, app-wide services. A failed start is retried next call. */
export function getServices(): Promise<Services> {
	instance ??= createServices(getHost()).catch((cause) => {
		instance = undefined;
		throw cause;
	});
	return instance;
}
