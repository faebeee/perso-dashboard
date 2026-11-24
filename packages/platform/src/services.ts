import type { IntegrationBackend } from "@dashboard/core/integration";
import type { OAuthProvider } from "@dashboard/core/oauth";
import { createAesGcmCipher } from "./crypto";
import { createDatabase } from "./db/client";
import { getHost, type Host } from "./host";
import { setDefaultHttpCache } from "./http";
import {
	createHttpCache,
	createMemoryCacheStore,
	type HttpCache,
	layeredCacheStore,
} from "./http-cache";
import { createTokenManager, type TokenManager } from "./oauth/token-manager";
import {
	type AiSummaryRepository,
	createDrizzleAiSummaryRepository,
} from "./repositories/ai-summary-repository";
import { createDrizzleCacheStore } from "./repositories/cache-repository";
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
	createDrizzleLlmCredentialRepository,
	type LlmCredentialRepository,
} from "./repositories/llm-credential-repository";
import {
	createDrizzleOAuthClientRepository,
	type OAuthClientRepository,
} from "./repositories/oauth-client-repository";
import {
	createDrizzleTodayRepository,
	type TodayRepository,
} from "./repositories/today-repository";
import { syncStatus } from "./sync-status";

/**
 * Fixed loopback port for OAuth redirects. Providers like Atlassian match the
 * redirect URI exactly, so it has to be stable. Changing it means updating
 * the redirect URIs registered in every OAuth app.
 */
export const OAUTH_LOOPBACK_PORT = 47390;

/** Cached API responses older than this are deleted at startup. */
const CACHE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/** AI summaries older than this are deleted at startup. */
const SUMMARY_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

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
	/** API keys of LLM providers (AI summary). */
	llmCredentials: LlmCredentialRepository;
	/** Generated Daily Review summaries, reused while the review is unchanged. */
	aiSummaries: AiSummaryRepository;
	/** API response cache: expire on manual refresh, clear on (dis)connect. */
	httpCache: HttpCache;
	tokenManager: TokenManager;
	/** Redirect URI to register in the provider's OAuth app. */
	oauthCallbackUrl(
		integration: Pick<IntegrationBackend, "id" | "oauthClient">,
	): string;
	/** null when the user hasn't entered this integration's OAuth client yet. */
	oauthProvider(integration: IntegrationBackend): Promise<OAuthProvider | null>;
	/** Runs the browser half of the OAuth flow for one integration. */
	authorizeInBrowser(
		integration: Pick<IntegrationBackend, "id" | "oauthClient">,
		url: URL,
	): Promise<URL>;
	cancelAuthorization(): Promise<void>;
}

/**
 * One path per integration, or per OAuth client when the provider matches
 * redirect URIs exactly and its integrations share one (Microsoft).
 */
const callbackPath = ({
	id,
	oauthClient,
}: Pick<IntegrationBackend, "id" | "oauthClient">) =>
	`/oauth/${encodeURIComponent(oauthClient.sharedRedirectUri ? oauthClient.id : id)}/callback`;

export async function createServices(host: Host): Promise<Services> {
	const [driver, key] = await Promise.all([
		host.openDatabase(),
		host.loadEncryptionKey(),
	]);
	const db = await createDatabase(driver);
	const cipher = await createAesGcmCipher(key);
	const connections = createDrizzleConnectionRepository(db, cipher);

	// One cache for every integration's API calls, persisted (encrypted) so a
	// restart starts warm. Week-old entries are dropped.
	const persistentCache = createDrizzleCacheStore(db, cipher);
	void persistentCache
		.prune(Date.now() - CACHE_RETENTION_MS)
		.catch((cause) => console.error("[cache] prune failed", cause));
	const httpCache = createHttpCache({
		store: layeredCacheStore(createMemoryCacheStore(), persistentCache),
		onEvent: syncStatus.record,
	});
	setDefaultHttpCache(httpCache);
	const oauthClients = createDrizzleOAuthClientRepository(db, cipher);
	const aiSummaries = createDrizzleAiSummaryRepository(db, cipher);
	void aiSummaries
		.prune(new Date(Date.now() - SUMMARY_RETENTION_MS))
		.catch((cause) => console.error("[ai-summary] prune failed", cause));

	const oauthCallbackUrl = (
		integration: Pick<IntegrationBackend, "id" | "oauthClient">,
	) =>
		`http://${integration.oauthClient.redirectHost ?? "127.0.0.1"}:${OAUTH_LOOPBACK_PORT}${callbackPath(integration)}`;

	const oauthProvider = async (integration: IntegrationBackend) => {
		const credentials = await oauthClients.get(integration.oauthClient.id);
		return credentials
			? integration.createOAuthProvider(
					credentials,
					oauthCallbackUrl(integration),
				)
			: null;
	};

	return {
		connections,
		oauthClients,
		layouts: createDrizzleLayoutRepository(db),
		dismissals: createDrizzleDismissalRepository(db),
		today: createDrizzleTodayRepository(db),
		llmCredentials: createDrizzleLlmCredentialRepository(db, cipher),
		aiSummaries,
		httpCache,
		tokenManager: createTokenManager({
			connections,
			resolveProvider: oauthProvider,
		}),
		oauthCallbackUrl,
		oauthProvider,
		authorizeInBrowser: (integration, url) =>
			host.authorizeInBrowser({
				url,
				port: OAUTH_LOOPBACK_PORT,
				callbackPath: callbackPath(integration),
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

/**
 * Marks cached API responses stale so the next requests really refetch
 * (manual "Refresh"). Rate-limit pauses still apply.
 */
export async function expireCachedData(integrationId?: string): Promise<void> {
	await (await getServices()).httpCache.expire(integrationId);
}
