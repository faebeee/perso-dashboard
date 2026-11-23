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
import type { IntegrationManifest } from "#/core/integration";
import { connectUrl, useDisconnectIntegration } from "../queries";
import type { IntegrationStatus } from "../server-fns";
import { OAuthSetupHint } from "./oauth-setup-hint";

interface ConnectionCardProps {
	integration: IntegrationManifest;
	status?: IntegrationStatus;
}

export function ConnectionCard({ integration, status }: ConnectionCardProps) {
	const disconnect = useDisconnectIntegration();
	const Icon = integration.icon;
	const connected = status?.connected ?? false;
	const configured = status?.configured ?? false;

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

			<CardContent className="text-sm text-muted-foreground">
				{connected && status?.accountLabel && (
					<p>
						Signed in as{" "}
						<span className="font-medium text-foreground">
							{status.accountLabel}
						</span>
					</p>
				)}
				{!configured && (
					<p>
						Set the OAuth client id and secret for {integration.name} in{" "}
						<code>.env</code> to enable it.
					</p>
				)}
				<OAuthSetupHint
					setup={integration.setup}
					callbackUrl={status?.callbackUrl}
				/>
				<p className="mt-1">
					{integration.widgets.length} widget
					{integration.widgets.length === 1 ? "" : "s"} available
				</p>
			</CardContent>

			<CardFooter className="gap-2">
				{configured && (
					<Button asChild variant={connected ? "outline" : "default"} size="sm">
						{/* Plain anchor: OAuth needs a full-page navigation. */}
						<a href={connectUrl(integration.id)}>
							{connected ? "Reconnect" : "Connect"}
						</a>
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
			</CardFooter>
		</Card>
	);
}
