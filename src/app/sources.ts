import type { SourceRegistry } from "#/components/source-kit/source-context";
import { integrationManifests } from "#/integrations/registry";

/** Name, icon and colour per integration id, for labelling rows everywhere. */
export const sourceRegistry: SourceRegistry = Object.fromEntries(
	integrationManifests.map(({ id, name, icon, accent }) => [
		id,
		{ name, icon, accent },
	]),
);
