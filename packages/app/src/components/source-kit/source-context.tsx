import type { IntegrationManifest } from "@dashboard/core/integration";
import { createContext, type ReactNode, useContext } from "react";

/** How a data source is presented: name, icon, colour, optional detail view. */
export type SourceInfo = Pick<
	IntegrationManifest,
	"name" | "icon" | "accent" | "details"
>;

export type SourceRegistry = Readonly<Record<string, SourceInfo>>;

const SourceContext = createContext<SourceRegistry>({});

/**
 * Provided once by the app (built from the integration manifests), so any
 * list can label its rows without threading a `sources` prop through.
 */
export function SourceProvider({
	sources,
	children,
}: {
	sources: SourceRegistry;
	children: ReactNode;
}) {
	return (
		<SourceContext.Provider value={sources}>{children}</SourceContext.Provider>
	);
}

export function useSources(): SourceRegistry {
	return useContext(SourceContext);
}

export function useSource(id: string): SourceInfo | undefined {
	return useContext(SourceContext)[id];
}
