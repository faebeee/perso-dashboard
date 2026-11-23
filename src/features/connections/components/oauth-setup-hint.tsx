import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import type { IntegrationManifest } from "#/core/integration";

interface OAuthSetupHintProps {
	setup: IntegrationManifest["setup"];
	callbackUrl?: string;
}

/** Where to create the OAuth app and which (loopback) redirect URI to register. */
export function OAuthSetupHint({ setup, callbackUrl }: OAuthSetupHintProps) {
	const [copied, setCopied] = useState(false);

	const copy = async () => {
		if (!callbackUrl) return;
		try {
			await navigator.clipboard.writeText(callbackUrl);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			// clipboard unavailable: the URL is still selectable
		}
	};

	return (
		<div className="mt-3 space-y-2 rounded-md border bg-muted/40 p-3 text-xs">
			<a
				href={setup.url}
				target="_blank"
				rel="noreferrer"
				className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-2 hover:underline"
			>
				{setup.label}
				<ExternalLink className="size-3" />
			</a>
			{callbackUrl && (
				<div>
					<p className="mb-1">Redirect URI to register:</p>
					<div className="flex items-center gap-1">
						<code
							className="min-w-0 flex-1 truncate select-all"
							title={callbackUrl}
						>
							{callbackUrl}
						</code>
						<Button
							variant="ghost"
							size="icon"
							className="size-6 shrink-0"
							onClick={copy}
							aria-label="Copy redirect URI"
						>
							{copied ? <Check /> : <Copy />}
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
