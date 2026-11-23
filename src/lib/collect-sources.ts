import { type IntegrationError, toIntegrationError } from "#/core/result";

export interface Source<T> {
	id: string;
	fetch: () => Promise<T[]>;
}

export interface Collected<T> {
	items: T[];
	/** One entry per source that failed; the others still contribute. */
	errors: IntegrationError[];
}

/** Fetches all sources in parallel and tolerates partial failure. */
export async function collectFromSources<T>(
	sources: readonly Source<T>[],
): Promise<Collected<T>> {
	const settled = await Promise.allSettled(sources.map((s) => s.fetch()));
	const items: T[] = [];
	const errors: IntegrationError[] = [];
	settled.forEach((outcome, index) => {
		if (outcome.status === "fulfilled") items.push(...outcome.value);
		else errors.push(toIntegrationError(outcome.reason, sources[index]?.id));
	});
	return { items, errors };
}

/**
 * Resolves to the fulfilled values, skipping individual failures (e.g. one
 * repo without access). Throws the first error only if *every* call failed,
 * so auth or rate-limit problems still surface.
 */
export async function settleLeniently<T>(
	promises: readonly Promise<T>[],
): Promise<T[]> {
	const settled = await Promise.allSettled(promises);
	const values = settled.flatMap((s) =>
		s.status === "fulfilled" ? [s.value] : [],
	);
	const firstError = settled.find((s) => s.status === "rejected");
	if (values.length === 0 && firstError?.status === "rejected") {
		throw firstError.reason;
	}
	return values;
}
