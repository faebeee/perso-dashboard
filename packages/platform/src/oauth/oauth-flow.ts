import type {
	AccountInfo,
	IntegrationBackend,
} from "@dashboard/core/integration";
import type { OAuthProvider } from "@dashboard/core/oauth";
import { randomToken } from "../encoding";
import { BrowserAuthError } from "../host";
import type { ConnectionRepository } from "../repositories/connection-repository";

/**
 * OAuth for a desktop app (RFC 8252): the system browser does the login and
 * the provider redirects to a loopback listener on 127.0.0.1. State and the
 * PKCE verifier never leave this function, so no cookies are needed.
 */

export type ConnectErrorCode =
	| "not_configured"
	| "access_denied"
	| "invalid_state"
	| "exchange_failed"
	| "cancelled"
	| "timeout"
	| "port_unavailable"
	| "browser"
	| "unknown";

export class ConnectError extends Error {
	readonly code: ConnectErrorCode;

	constructor(code: ConnectErrorCode, message: string = code) {
		super(message);
		this.name = "ConnectError";
		this.code = code;
	}
}

/** Opens the URL in the browser and resolves with the redirect it receives. */
export type BrowserAuthorizer = (authorizationUrl: URL) => Promise<URL>;

export async function connectIntegration(input: {
	integration: IntegrationBackend;
	provider: OAuthProvider;
	authorize: BrowserAuthorizer;
	connections: ConnectionRepository;
}): Promise<AccountInfo> {
	const { integration, provider } = input;
	const state = randomToken();
	const codeVerifier = randomToken();
	const url = await provider.createAuthorizationUrl({ state, codeVerifier });

	let redirect: URL;
	try {
		redirect = await input.authorize(url);
	} catch (cause) {
		if (cause instanceof BrowserAuthError) {
			throw new ConnectError(
				cause.kind === "io" ? "unknown" : cause.kind,
				cause.message,
			);
		}
		throw cause;
	}

	// State first: a redirect we didn't start (forged, or a stale tab) is
	// rejected before anything in it, error messages included, is used.
	if (redirect.searchParams.get("state") !== state) {
		throw new ConnectError("invalid_state");
	}

	const providerError = redirect.searchParams.get("error");
	if (providerError) {
		throw new ConnectError(
			providerError === "access_denied" ? "access_denied" : "unknown",
			redirect.searchParams.get("error_description") ?? providerError,
		);
	}

	const code = redirect.searchParams.get("code");
	if (!code) {
		throw new ConnectError("invalid_state");
	}

	try {
		const tokens = await provider.exchangeCode({ code, codeVerifier });
		const account = await integration.describeAccount({
			accessToken: tokens.accessToken,
			meta: {},
		});
		await input.connections.save({
			integrationId: integration.id,
			tokens,
			accountLabel: account.label,
			meta: account.meta ?? {},
		});
		return account;
	} catch (cause) {
		console.error(`[oauth] ${integration.id} code exchange failed`, cause);
		throw new ConnectError("exchange_failed", (cause as Error).message);
	}
}
