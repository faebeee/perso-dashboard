import { CircleAlert, Loader2 } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { SyncLine } from "#/components/widget-kit/sync-status";
import type { IntegrationManifest } from "#/core/integration";
import {
	ConnectError,
	type ConnectErrorCode,
} from "#/platform/oauth/oauth-flow";
import type { IntegrationStatus } from "../fetchers";
import { useConnectIntegration, useDisconnectIntegration } from "../queries";
import { OAuthClientForm } from "./oauth-client-form";
import { OAuthSetupHint } from "./oauth-setup-hint";

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
						<AlertDescription>{describeError(connect.error)}</AlertDescription>
					</Alert>
				)}

				{showClientForm && (
					<OAuthClientForm
						oauthClientId={client.id}
						label={client.label}
						integrationIds={[integration.id, ...client.sharedWith]}
						sharedWithNames={client.sharedWith.map(nameOf)}
						currentClientId={client.clientId}
						onDone={configured ? () => setEditingClient(false) : undefined}
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
		</Card>
	);
}

const isCancelled = (error: Error) =>
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

function describeError(error: Error): string {
	if (error instanceof ConnectError) {
		return ERROR_MESSAGES[error.code] ?? error.message;
	}
	return error.message;
}
