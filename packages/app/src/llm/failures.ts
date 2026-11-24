import { llmErrorSource } from "@dashboard/core/llm";
import {
	type IntegrationErrorKind,
	IntegrationFailure,
} from "@dashboard/core/result";

export const llmFailure = (
	providerId: string,
	kind: IntegrationErrorKind,
	message: string,
) =>
	new IntegrationFailure({
		kind,
		message,
		integrationId: llmErrorSource(providerId),
	});

/** Pure: an HTTP status → the failure the user sees. */
export function failureForStatus(
	providerId: string,
	label: string,
	status: number,
	detail = "",
): IntegrationFailure {
	const suffix = detail ? `: ${detail.slice(0, 200)}` : "";
	if (status === 401 || status === 403)
		return llmFailure(
			providerId,
			"unauthorized",
			`${label} rejected the API key (${status})${suffix}`,
		);
	if (status === 429)
		return llmFailure(
			providerId,
			"rate_limited",
			`${label} is rate limiting requests. Try again in a moment.`,
		);
	if (status === 404)
		return llmFailure(
			providerId,
			"unknown",
			`${label} doesn't know this model (404)${suffix}`,
		);
	return llmFailure(
		providerId,
		"unknown",
		`${label} answered ${status}${suffix}`,
	);
}

/** Runs a request; a fetch that throws (offline, server down) is a network failure. */
export async function send(
	providerId: string,
	unreachable: string,
	request: () => Promise<Response>,
): Promise<Response> {
	try {
		return await request();
	} catch (cause) {
		if ((cause as Error)?.name === "AbortError") throw cause;
		throw llmFailure(providerId, "network", unreachable);
	}
}

/** Fails on a non-2xx response, with the body's error text when there is one. */
export async function readJson(
	providerId: string,
	label: string,
	response: Response,
): Promise<unknown> {
	const text = await response.text().catch(() => "");
	if (!response.ok) {
		let detail = text;
		try {
			const body = JSON.parse(text);
			detail =
				typeof body?.error === "string"
					? body.error
					: (body?.error?.message ?? body?.message ?? text);
		} catch {
			// not JSON: keep the raw text
		}
		throw failureForStatus(providerId, label, response.status, detail);
	}
	try {
		return JSON.parse(text);
	} catch {
		throw llmFailure(
			providerId,
			"unknown",
			`${label} sent an unreadable answer.`,
		);
	}
}

export function requireKey(
	providerId: string,
	label: string,
	apiKey: string | undefined,
): string {
	if (!apiKey)
		throw llmFailure(
			providerId,
			"not_configured",
			`Enter an API key for ${label} in Preferences.`,
		);
	return apiKey;
}
