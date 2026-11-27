import type { IntegrationManifest } from "@dashboard/core/integration";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@dashboard/ui/components/alert";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@dashboard/ui/components/card";
import { Link } from "@tanstack/react-router";
import { CircleAlert, Loader2, Settings2, Wand2 } from "lucide-react";
import { useState } from "react";
import { SyncLine } from "#/components/widget-kit/sync-status";
import { describeConnectError, isCancelled } from "../connect-errors";
import type { IntegrationStatus } from "../fetchers";
import { useConnectIntegration, useDisconnectIntegration } from "../queries";
import { OAuthClientForm } from "./oauth-client-form";
import { OAuthSetupHint } from "./oauth-setup-hint";
import { SetupWizard } from "./setup-wizard";

interface ConnectionCardProps {
	integration: IntegrationManifest;
	status?: IntegrationStatus;
	/** Display name for an integration id (for "shared with" hints). */
	nameOf: (integrationId: string) => string;
}

export function ConnectionCard({
	integration,
	status,
	nameOf,
}: ConnectionCardProps) {
	const connect = useConnectIntegration(integration.id);
	const disconnect = useDisconnectIntegration();
	const [editingClient, setEditingClient] = useState(false);
	const [wizardOpen, setWizardOpen] = useState(false);
	const Icon = integration.icon;
	const connected = status?.connected ?? false;
	const configured = status?.configured ?? false;
	const client = status?.oauthClient;
	const showClientForm = client && (!configured || editingClient);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Icon className="size-5" />
					{integration.name}
				</CardTitle>
				<CardDescription>{integration.description}</CardDescription>
				<CardAction>
					{connected ? (
						<Badge>Connected</Badge>
					) : configured ? (
						<Badge variant="secondary">Not connected</Badge>
					) : (
						<Badge variant="outline">Not configured</Badge>
					)}
				</CardAction>
			</CardHeader>

			<CardContent className="space-y-3 text-sm text-muted-foreground">
				{connected && status?.accountLabel && (
					<p>
						Signed in as{" "}
						<span className="font-medium text-foreground">
							{status.accountLabel}
						</span>
					</p>
				)}
				{connected && <SyncLine integrationId={integration.id} />}

				{connect.isPending && (
					<Alert>
						<Loader2 className="animate-spin" />
						<AlertTitle>Waiting for your browser…</AlertTitle>
						<AlertDescription>
							Finish signing in to {integration.name} in the browser window that
							just opened.
						</AlertDescription>
					</Alert>
				)}
				{connect.error && !isCancelled(connect.error) && (
					<Alert variant="destructive">
						<CircleAlert />
						<AlertTitle>Could not connect {integration.name}</AlertTitle>
						<AlertDescription>
							{describeConnectError(connect.error)}
						</AlertDescription>
					</Alert>
				)}

				{showClientForm && (
					<OAuthClientForm
						oauthClientId={client.id}
						label={client.label}
						publicClient={client.publicClient}
						integrationIds={[integration.id, ...client.sharedWith]}
						sharedWithNames={client.sharedWith.map(nameOf)}
						currentClientId={client.clientId}
						onSaved={() => setEditingClient(false)}
						onCancel={configured ? () => setEditingClient(false) : undefined}
					/>
				)}

				<OAuthSetupHint
					setup={integration.setup}
					callbackUrl={status?.callbackUrl}
				/>
				<p>
					{integration.widgets.length} widget
					{integration.widgets.length === 1 ? "" : "s"} available
				</p>
			</CardContent>

			<CardFooter className="flex-wrap gap-2">
				{!connected && integration.setupGuide && status && (
					<Button
						variant={configured ? "outline" : "default"}
						size="sm"
						onClick={() => setWizardOpen(true)}
					>
						<Wand2 /> Guided setup
					</Button>
				)}
				{configured &&
					(connect.isPending ? (
						<Button variant="outline" size="sm" onClick={connect.cancel}>
							Cancel
						</Button>
					) : (
						<Button
							variant={connected ? "outline" : "default"}
							size="sm"
							onClick={() => connect.mutate()}
						>
							{connected ? "Reconnect" : "Connect"}
						</Button>
					))}
				{connected && status && status.settingLabels.length > 0 && (
					<Button asChild variant="outline" size="sm">
						<Link
							to="/settings/preferences/$integrationId"
							params={{ integrationId: integration.id }}
						>
							<Settings2 />
							{status.settingLabels.length === 1
								? `Choose ${status.settingLabels[0]?.toLowerCase()}`
								: "Settings"}
						</Link>
					</Button>
				)}
				{connected && (
					<Button
						variant="ghost"
						size="sm"
						disabled={disconnect.isPending}
						onClick={() => disconnect.mutate(integration.id)}
					>
						Disconnect
					</Button>
				)}
				{configured && !editingClient && (
					<Button
						variant="ghost"
						size="sm"
						className="ml-auto"
						onClick={() => setEditingClient(true)}
					>
						Edit OAuth client
					</Button>
				)}
			</CardFooter>
			{status && wizardOpen && (
				<SetupWizard
					integration={integration}
					status={status}
					nameOf={nameOf}
					open={wizardOpen}
					onOpenChange={setWizardOpen}
				/>
			)}
		</Card>
	);
}
