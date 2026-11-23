import {
	ArrowLeft,
	ArrowRight,
	Check,
	CircleCheck,
	Copy,
	ExternalLink,
	Loader2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	type IntegrationManifest,
	resolveSetupGuide,
	type SetupStep,
} from "#/core/integration";
import { cn } from "#/lib/utils";
import { describeConnectError, isCancelled } from "../connect-errors";
import type { IntegrationStatus } from "../fetchers";
import { useConnectIntegration } from "../queries";
import { OAuthClientForm } from "./oauth-client-form";

interface SetupWizardProps {
	integration: IntegrationManifest;
	status: IntegrationStatus;
	/** Display name for an integration id (shared-client hint). */
	nameOf: (integrationId: string) => string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

/**
 * Guided setup: the integration's own steps for creating its OAuth app,
 * then entering the client ID/secret, then connecting.
 */
export function SetupWizard({
	integration,
	status,
	nameOf,
	open,
	onOpenChange,
}: SetupWizardProps) {
	const guide = useMemo(
		() =>
			integration.setupGuide
				? resolveSetupGuide(integration.setupGuide, status.callbackUrl)
				: { steps: [] },
		[integration.setupGuide, status.callbackUrl],
	);
	const guideSteps = guide.steps.length;
	const total = guideSteps + 2; // + credentials + connect
	const [step, setStep] = useState(() =>
		status.configured ? guideSteps + 1 : 0,
	);

	const next = () => setStep((s) => Math.min(total - 1, s + 1));
	const back = () => setStep((s) => Math.max(0, s - 1));
	const current: SetupStep | undefined = guide.steps[step];
	const stepTitle =
		current?.title ??
		(step === guideSteps ? "Enter the credentials" : "Connect");

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[85vh] max-w-xl flex-col gap-0 overflow-hidden p-0">
				<div className="border-b px-6 pt-5 pb-4 pr-12">
					<DialogDescription className="text-xs">
						Set up {integration.name} · step {step + 1} of {total}
					</DialogDescription>
					<DialogTitle className="mt-0.5">{stepTitle}</DialogTitle>
					<ol className="mt-3 flex gap-1" aria-hidden>
						{Array.from({ length: total }, (_, i) => (
							<li
								// biome-ignore lint/suspicious/noArrayIndexKey: fixed progress slots
								key={i}
								className={cn(
									"h-1 flex-1 rounded-full",
									i <= step ? "bg-primary" : "bg-muted",
								)}
							/>
						))}
					</ol>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
					{current ? (
						<GuideStep step={current} />
					) : step === guideSteps ? (
						<div className="space-y-2 text-sm">
							<p className="text-muted-foreground">
								Paste the Client ID and secret from the previous step. They're
								encrypted and stay on this computer.
							</p>
							{status.configured && (
								<p className="text-muted-foreground">
									Already saved: <code>{status.oauthClient.clientId}</code>.
									Enter new values to replace them, or continue.
								</p>
							)}
							<OAuthClientForm
								oauthClientId={status.oauthClient.id}
								label={status.oauthClient.label}
								integrationIds={[
									integration.id,
									...status.oauthClient.sharedWith,
								]}
								sharedWithNames={status.oauthClient.sharedWith.map(nameOf)}
								currentClientId={status.oauthClient.clientId}
								onSaved={next}
							/>
						</div>
					) : (
						<ConnectStep
							integration={integration}
							configured={status.configured}
							onDone={() => onOpenChange(false)}
						/>
					)}
				</div>

				<div className="flex items-center gap-2 border-t px-6 py-3">
					<Button
						variant="ghost"
						size="sm"
						onClick={back}
						disabled={step === 0}
					>
						<ArrowLeft /> Back
					</Button>
					{step < guideSteps && (
						<Button size="sm" className="ml-auto" onClick={next}>
							Next <ArrowRight />
						</Button>
					)}
					{step === guideSteps && status.configured && (
						<Button
							size="sm"
							variant="outline"
							className="ml-auto"
							onClick={next}
						>
							Continue with saved credentials <ArrowRight />
						</Button>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

function GuideStep({ step }: { step: SetupStep }) {
	return (
		<div className="space-y-4 text-sm">
			{step.text.split(/\n\s*\n/).map((paragraph) => (
				<p key={paragraph}>{paragraph}</p>
			))}
			{step.links && step.links.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{step.links.map((link) => (
						<Button key={link.url} asChild size="sm" variant="outline">
							<a href={link.url} target="_blank" rel="noreferrer">
								{link.label} <ExternalLink />
							</a>
						</Button>
					))}
				</div>
			)}
			{step.copy && step.copy.length > 0 && (
				<dl className="space-y-2">
					{step.copy.map((field) => (
						<CopyField
							key={field.label}
							label={field.label}
							value={field.value}
						/>
					))}
				</dl>
			)}
		</div>
	);
}

function CopyField({ label, value }: { label: string; value: string }) {
	const [copied, setCopied] = useState(false);
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			// clipboard unavailable: the value is selectable
		}
	};
	return (
		<div>
			<dt className="text-xs text-muted-foreground">{label}</dt>
			<dd className="mt-0.5 flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1">
				<code
					className="min-w-0 flex-1 truncate text-xs select-all"
					title={value}
				>
					{value}
				</code>
				<Button
					variant="ghost"
					size="icon"
					className="size-7 shrink-0"
					onClick={copy}
					aria-label={`Copy ${label}`}
				>
					{copied ? <Check /> : <Copy />}
				</Button>
			</dd>
		</div>
	);
}

function ConnectStep({
	integration,
	configured,
	onDone,
}: {
	integration: IntegrationManifest;
	configured: boolean;
	onDone: () => void;
}) {
	const connect = useConnectIntegration(integration.id);

	if (connect.isSuccess) {
		return (
			<div className="space-y-4">
				<Alert>
					<CircleCheck />
					<AlertTitle>{integration.name} is connected</AlertTitle>
					<AlertDescription>
						Its widgets, page and urgent items now load data.
					</AlertDescription>
				</Alert>
				<Button size="sm" onClick={onDone}>
					Done
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-4 text-sm">
			<p>
				Click Connect and sign in to {integration.name} in the browser window
				that opens. You'll come back here automatically.
			</p>
			{connect.error && !isCancelled(connect.error) && (
				<p role="alert" className="text-destructive">
					{describeConnectError(connect.error)}
				</p>
			)}
			{connect.isPending ? (
				<div className="flex items-center gap-2">
					<Loader2 className="size-4 animate-spin" /> Waiting for your browser…
					<Button
						variant="ghost"
						size="sm"
						className="ml-auto"
						onClick={connect.cancel}
					>
						Cancel
					</Button>
				</div>
			) : (
				<Button
					size="sm"
					disabled={!configured}
					onClick={() => connect.mutate()}
				>
					Connect {integration.name}
				</Button>
			)}
			{!configured && (
				<p className="text-xs text-muted-foreground">
					Save the credentials first.
				</p>
			)}
		</div>
	);
}
