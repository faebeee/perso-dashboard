import type { IntegrationManifest } from "@dashboard/core/integration";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@dashboard/ui/components/alert";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Wand2 } from "lucide-react";
import { connectionQueries } from "../queries";
import { ConnectionCard } from "./connection-card";

interface ConnectionsPageProps {
	integrations: readonly IntegrationManifest[];
}

export function ConnectionsPage({ integrations }: ConnectionsPageProps) {
	const { data: statuses } = useSuspenseQuery(connectionQueries.statuses());
	const nameOf = (id: string) =>
		integrations.find((i) => i.id === id)?.name ?? id;

	const nothingConfigured = statuses.every((s) => !s.configured);

	return (
		<div className="space-y-4">
			{nothingConfigured && (
				<Alert>
					<Wand2 />
					<AlertTitle>New here?</AlertTitle>
					<AlertDescription>
						Each source needs a small OAuth app of your own (a few minutes,
						once). Pick a source below and click <strong>Guided setup</strong>:
						it walks you through creating the app and connecting.
					</AlertDescription>
				</Alert>
			)}
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
		</div>
	);
}
