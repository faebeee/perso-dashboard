import {
	ConnectError,
	type ConnectErrorCode,
} from "@dashboard/platform/oauth/oauth-flow";

/** The user cancelled on purpose: not an error worth showing. */
export const isCancelled = (error: Error) =>
	error instanceof ConnectError && error.code === "cancelled";

const ERROR_MESSAGES: Partial<Record<ConnectErrorCode, string>> = {
	not_configured: "Add the OAuth client ID and secret first.",
	access_denied: "Access was denied on the provider's consent screen.",
	invalid_state: "The login response didn't match this request. Try again.",
	timeout: "Timed out waiting for the browser. Try again.",
	port_unavailable:
		"The local OAuth callback port is in use by another program. Close it and try again.",
	browser: "Could not open the system browser.",
};

/** A sentence for the user, for any error from connecting. */
export function describeConnectError(error: Error): string {
	if (error instanceof ConnectError) {
		return ERROR_MESSAGES[error.code] ?? error.message;
	}
	return error.message;
}
