/**
 * Typed error model shared by every integration.
 *
 * Server functions return `Result<T>` (a plain, serializable object) instead
 * of throwing, so error *kinds* survive the network boundary. The client then
 * calls `unwrap()` inside a queryFn, which re-throws an `IntegrationFailure`
 * that UI components can inspect.
 */

export type IntegrationErrorKind =
	| "not_configured" // OAuth client id/secret missing in env
	| "not_connected" // user hasn't connected the account yet
	| "unauthorized" // token revoked/expired and refresh failed
	| "rate_limited"
	| "network"
	| "unknown";

export interface IntegrationError {
	kind: IntegrationErrorKind;
	message: string;
	integrationId?: string;
	/** Seconds until a retry makes sense (rate limits). */
	retryAfter?: number;
}

export type Result<T> =
	| { ok: true; value: T }
	| { ok: false; error: IntegrationError };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });

export const err = (error: IntegrationError): Result<never> => ({
	ok: false,
	error,
});

export class IntegrationFailure extends Error {
	readonly error: IntegrationError;

	constructor(error: IntegrationError) {
		super(error.message);
		this.name = "IntegrationFailure";
		this.error = error;
	}
}

export function toIntegrationError(
	cause: unknown,
	integrationId?: string,
): IntegrationError {
	if (cause instanceof IntegrationFailure) {
		return { integrationId, ...cause.error };
	}
	const message = cause instanceof Error ? cause.message : String(cause);
	return { kind: "unknown", message, integrationId };
}

/** Converts a Result back into a value, throwing `IntegrationFailure` on error. */
export function unwrap<T>(result: Result<T>): T {
	if (result.ok) return result.value;
	throw new IntegrationFailure(result.error);
}
