import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import { type FormEvent, useId, useState } from "react";
import { useSaveOAuthClient } from "../queries";

interface OAuthClientFormProps {
	oauthClientId: string;
	label: string;
	/** Public client: no secret field. */
	publicClient?: boolean;
	/** Integration ids that use this client (reloaded after saving). */
	integrationIds: string[];
	/** Names of other integrations sharing the client, for a hint. */
	sharedWithNames: string[];
	/** Pre-filled when editing existing credentials. */
	currentClientId: string | null;
	/** Called after the credentials were saved. */
	onSaved?: () => void;
	/** Shows a Cancel button when given. */
	onCancel?: () => void;
}

/** Client id + secret of the user's own OAuth app, stored encrypted locally. */
export function OAuthClientForm({
	oauthClientId,
	label,
	publicClient = false,
	integrationIds,
	sharedWithNames,
	currentClientId,
	onSaved,
	onCancel,
}: OAuthClientFormProps) {
	const id = useId();
	const [clientId, setClientId] = useState(currentClientId ?? "");
	const [clientSecret, setClientSecret] = useState("");
	const save = useSaveOAuthClient({ oauthClientId, integrationIds });

	const submit = (event: FormEvent) => {
		event.preventDefault();
		save.mutate(
			{ clientId, clientSecret },
			{
				onSuccess: () => {
					setClientSecret("");
					onSaved?.();
				},
			},
		);
	};

	return (
		<form onSubmit={submit} className="mt-3 space-y-2">
			<p className="text-xs font-medium text-foreground">{label}</p>
			<label htmlFor={`${id}-id`} className="sr-only">
				Client ID
			</label>
			<Input
				id={`${id}-id`}
				placeholder="Client ID"
				autoComplete="off"
				spellCheck={false}
				value={clientId}
				onChange={(e) => setClientId(e.target.value)}
			/>
			{!publicClient && (
				<>
					<label htmlFor={`${id}-secret`} className="sr-only">
						Client secret
					</label>
					<Input
						id={`${id}-secret`}
						type="password"
						placeholder={
							currentClientId ? "New client secret" : "Client secret"
						}
						autoComplete="off"
						value={clientSecret}
						onChange={(e) => setClientSecret(e.target.value)}
					/>
				</>
			)}
			{sharedWithNames.length > 0 && (
				<p className="text-xs">Shared with {sharedWithNames.join(", ")}.</p>
			)}
			{save.error && (
				<p className="text-xs text-destructive">{save.error.message}</p>
			)}
			<div className="flex gap-2">
				<Button
					type="submit"
					size="sm"
					disabled={
						save.isPending ||
						!clientId.trim() ||
						(!publicClient && !clientSecret.trim())
					}
				>
					Save
				</Button>
				{onCancel && (
					<Button type="button" size="sm" variant="ghost" onClick={onCancel}>
						Cancel
					</Button>
				)}
			</div>
		</form>
	);
}
