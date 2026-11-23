import { useSuspenseQuery } from "@tanstack/react-query";
import type { IntegrationManifest } from "#/core/integration";
import { connectionQueries } from "../queries";
import { ConnectionCard } from "./connection-card";

interface ConnectionsPageProps {
	integrations: readonly IntegrationManifest[];
}

export function ConnectionsPage({ integrations }: ConnectionsPageProps) {
	const { data: statuses } = useSuspenseQuery(connectionQueries.statuses());
	const nameOf = (id: string) =>
		integrations.find((i) => i.id === id)?.name ?? id;

	return (
		<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			{integrations.map((integration) => (
				<ConnectionCard
					key={integration.id}
					integration={integration}
					status={statuses.find((s) => s.integrationId === integration.id)}
					nameOf={nameOf}
				/>
			))}
		</div>
	);
}
