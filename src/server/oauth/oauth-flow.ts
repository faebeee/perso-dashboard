import "@tanstack/react-start/server-only";
import { generateCodeVerifier, generateState } from "arctic";
import type { IntegrationServer } from "#/core/integration";
import type { OAuthProvider } from "#/core/oauth";
import type { ConnectionRepository } from "../repositories/connection-repository";

/**
 * Framework-agnostic OAuth authorization-code flow (with PKCE where the
 * provider supports it). Takes a Request and returns a Response, so the
 * route files that call it stay one-liners.
 */

const COOKIE_PREFIX = "oauth_";
const COOKIE_PATH = "/api/oauth";
const COOKIE_MAX_AGE_SECONDS = 600;

/** Where the browser lands after the flow finishes. */
const RETURN_PATH = "/settings/integrations";

export function beginAuthorization(input: {
	integrationId: string;
	provider: OAuthProvider;
	secureCookies: boolean;
}): Response {
	const state = generateState();
	const codeVerifier = generateCodeVerifier();
	const url = input.provider.createAuthorizationUrl({ state, codeVerifier });

	return new Response(null, {
		status: 302,
		headers: {
			Location: url.toString(),
			"Set-Cookie": serializeCookie(
				COOKIE_PREFIX + input.integrationId,
				`${state}.${codeVerifier}`,
				{ maxAge: COOKIE_MAX_AGE_SECONDS, secure: input.secureCookies },
			),
		},
	});
}

export async function completeAuthorization(input: {
	request: Request;
	integration: IntegrationServer;
	provider: OAuthProvider;
	connections: ConnectionRepository;
	appUrl: string;
	secureCookies: boolean;
}): Promise<Response> {
	const { request, integration, appUrl } = input;
	const url = new URL(request.url);
	const cookieName = COOKIE_PREFIX + integration.id;
	const clearCookie = serializeCookie(cookieName, "", {
		maxAge: 0,
		secure: input.secureCookies,
	});

	const finish = (params: Record<string, string>) => {
		const target = new URL(RETURN_PATH, appUrl);
		for (const [k, v] of Object.entries(params)) target.searchParams.set(k, v);
		return new Response(null, {
			status: 302,
			headers: { Location: target.toString(), "Set-Cookie": clearCookie },
		});
	};

	const providerError = url.searchParams.get("error");
	if (providerError) {
		return finish({ integration: integration.id, error: providerError });
	}

	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const stored = parseCookies(request.headers.get("cookie"))[cookieName];
	const [storedState, codeVerifier] = stored?.split(".") ?? [];

	if (
		!code ||
		!state ||
		!storedState ||
		!codeVerifier ||
		state !== storedState
	) {
		return finish({ integration: integration.id, error: "invalid_state" });
	}

	try {
		const tokens = await input.provider.exchangeCode({ code, codeVerifier });
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
		return finish({ connected: integration.id });
	} catch (cause) {
		console.error(`[oauth] ${integration.id} callback failed`, cause);
		return finish({ integration: integration.id, error: "exchange_failed" });
	}
}

function serializeCookie(
	name: string,
	value: string,
	options: { maxAge: number; secure: boolean },
): string {
	const parts = [
		`${name}=${encodeURIComponent(value)}`,
		`Path=${COOKIE_PATH}`,
		`Max-Age=${options.maxAge}`,
		"HttpOnly",
		"SameSite=Lax",
	];
	if (options.secure) parts.push("Secure");
	return parts.join("; ");
}

function parseCookies(header: string | null): Record<string, string> {
	const result: Record<string, string> = {};
	for (const part of header?.split(";") ?? []) {
		const index = part.indexOf("=");
		if (index === -1) continue;
		const key = part.slice(0, index).trim();
		result[key] = decodeURIComponent(part.slice(index + 1).trim());
	}
	return result;
}
