import "@tanstack/react-start/server-only";
import type { IntegrationServer } from "#/core/integration";
import { createAesGcmCipher } from "./crypto";
import { createDatabase } from "./db/client";
import { getEnv } from "./env";
import { createTokenManager, type TokenManager } from "./oauth/token-manager";
import {
	type ConnectionRepository,
	createDrizzleConnectionRepository,
} from "./repositories/connection-repository";
import {
	createDrizzleLayoutRepository,
	type LayoutRepository,
} from "./repositories/layout-repository";

/**
 * Composition root for server-side dependencies. Everything that needs the
 * DB, crypto or token handling gets it from here, so swapping an
 * implementation (e.g. Postgres instead of SQLite) is a one-file change.
 */
export interface Services {
	connections: ConnectionRepository;
	layouts: LayoutRepository;
	tokenManager: TokenManager;
	appUrl: string;
	oauthCallbackUrl(integrationId: string): string;
	oauthProvider(
		integration: IntegrationServer,
	): ReturnType<IntegrationServer["createOAuthProvider"]>;
}

let instance: Services | undefined;

export function getServices(): Services {
	if (instance) return instance;

	const env = getEnv();
	const db = createDatabase(env.DATABASE_PATH);
	const cipher = createAesGcmCipher(env.ENCRYPTION_KEY);
	const connections = createDrizzleConnectionRepository(db, cipher);

	const oauthCallbackUrl = (integrationId: string) =>
		new URL(`/api/oauth/${integrationId}/callback`, env.APP_URL).toString();
	const oauthProvider = (integration: IntegrationServer) =>
		integration.createOAuthProvider(oauthCallbackUrl(integration.id));

	instance = {
		connections,
		layouts: createDrizzleLayoutRepository(db),
		tokenManager: createTokenManager({
			connections,
			resolveProvider: oauthProvider,
		}),
		appUrl: env.APP_URL,
		oauthCallbackUrl,
		oauthProvider,
	};
	return instance;
}
