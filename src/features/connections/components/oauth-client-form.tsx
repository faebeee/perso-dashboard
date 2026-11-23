import { type FormEvent, useId, useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { useSaveOAuthClient } from "../queries";

interface OAuthClientFormProps {
	oauthClientId: string;
	label: string;
	/** Integration ids that use this client (reloaded after saving). */
	integrationIds: string[];
	/** Names of other integrations sharing the client, for a hint. */
	sharedWithNames: string[];
	/** Pre-filled when editing existing credentials. */
	currentClientId: string | null;
	onDone?: () => void;
}

/** Client id + secret of the user's own OAuth app, stored encrypted locally. */
export function OAuthClientForm({
	oauthClientId,
	label,
	integrationIds,
	sharedWithNames,
	currentClientId,
	onDone,
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
					onDone?.();
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
			<label htmlFor={`${id}-secret`} className="sr-only">
				Client secret
			</label>
			<Input
				id={`${id}-secret`}
				type="password"
				placeholder={currentClientId ? "New client secret" : "Client secret"}
				autoComplete="off"
				value={clientSecret}
				onChange={(e) => setClientSecret(e.target.value)}
			/>
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
					disabled={save.isPending || !clientId.trim() || !clientSecret.trim()}
				>
					Save
				</Button>
				{onDone && (
					<Button type="button" size="sm" variant="ghost" onClick={onDone}>
						Cancel
					</Button>
				)}
			</div>
		</form>
	);
}
