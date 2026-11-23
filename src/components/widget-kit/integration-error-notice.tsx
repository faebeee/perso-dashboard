import { Link } from "@tanstack/react-router";
import { AlertTriangle, PlugZap, RefreshCw, Timer } from "lucide-react";
import { Button } from "#/components/ui/button";
import { type IntegrationError, IntegrationFailure } from "#/core/result";

interface IntegrationErrorNoticeProps {
	error: unknown;
	onRetry?: () => void;
}

/** Turns a typed integration error into the right call to action. */
export function IntegrationErrorNotice({
	error,
	onRetry,
}: IntegrationErrorNoticeProps) {
	const info: IntegrationError =
		error instanceof IntegrationFailure
			? error.error
			: {
					kind: "unknown",
					message: (error as Error)?.message ?? "Unknown error",
				};

	switch (info.kind) {
		case "not_configured":
			return (
				<Notice icon={PlugZap} title="Not configured">
					Add the OAuth client id and secret to <code>.env</code>, then restart
					the server.
				</Notice>
			);
		case "not_connected":
		case "unauthorized":
			return (
				<Notice
					icon={PlugZap}
					title={
						info.kind === "unauthorized" ? "Reconnect needed" : "Not connected"
					}
					action={
						<Button asChild size="sm" variant="outline">
							<Link to="/settings/integrations">
								{info.kind === "unauthorized" ? "Reconnect" : "Connect"}
							</Link>
						</Button>
					}
				>
					{info.kind === "unauthorized"
						? info.message
						: "Connect this account to see data here."}
				</Notice>
			);
		case "rate_limited":
			return (
				<Notice icon={Timer} title="Rate limited">
					{info.retryAfter
						? `Try again in ~${Math.ceil(info.retryAfter / 60)} min.`
						: info.message}
				</Notice>
			);
		default:
			return (
				<Notice
					icon={AlertTriangle}
					title="Something went wrong"
					action={
						onRetry && (
							<Button size="sm" variant="outline" onClick={onRetry}>
								<RefreshCw /> Retry
							</Button>
						)
					}
				>
					{info.message}
				</Notice>
			);
	}
}

function Notice({
	icon: Icon,
	title,
	children,
	action,
}: {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	children: React.ReactNode;
	action?: React.ReactNode;
}) {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
			<Icon className="size-5 text-muted-foreground" />
			<p className="text-sm font-medium">{title}</p>
			<p className="max-w-xs text-xs text-muted-foreground">{children}</p>
			{action}
		</div>
	);
}
