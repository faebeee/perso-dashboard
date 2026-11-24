import { preferences } from "@dashboard/platform/preferences";
import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import { useQuery } from "@tanstack/react-query";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import { useId, useState, useSyncExternalStore } from "react";
import { getLlmProvider, llmProviders } from "#/llm/registry";
import {
	llmQueries,
	useCompletion,
	useDeleteLlmKey,
	useSaveLlmKey,
} from "../queries";

const fieldClass =
	"h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** Preferences section: which LLM writes the Daily Review summary. */
export function LlmSettings() {
	const prefs = useSyncExternalStore(preferences.subscribe, preferences.get);
	const provider = getLlmProvider(prefs.llm.provider);
	const ids = { provider: useId(), model: useId(), key: useId() };

	const choose = (id: string) =>
		preferences.set("llm", { ...prefs.llm, provider: id || null });
	const setModel = (model: string) => {
		if (!provider) return;
		preferences.set("llm", {
			...prefs.llm,
			models: { ...prefs.llm.models, [provider.id]: model },
		});
	};

	return (
		<div className="max-w-2xl divide-y rounded-xl border bg-card shadow-xs">
			<div className="flex items-start gap-4 p-4">
				<div className="min-w-0 flex-1">
					<label htmlFor={ids.provider} className="text-sm font-medium">
						Provider
					</label>
					<p className="mt-0.5 text-sm text-muted-foreground">
						{provider?.description ??
							"Summarize the Daily Review with a language model. Your activity is sent to the provider you choose."}
					</p>
				</div>
				<select
					id={ids.provider}
					className={fieldClass}
					value={provider?.id ?? ""}
					onChange={(e) => choose(e.target.value)}
				>
					<option value="">Off</option>
					{llmProviders.map((p) => (
						<option key={p.id} value={p.id}>
							{p.label}
						</option>
					))}
				</select>
			</div>

			{provider && (
				<>
					<div className="flex items-start gap-4 p-4">
						<div className="min-w-0 flex-1">
							<label htmlFor={ids.model} className="text-sm font-medium">
								Model
							</label>
							<p className="mt-0.5 text-sm text-muted-foreground">
								Leave empty for {provider.defaultModel}.
							</p>
						</div>
						<Input
							id={ids.model}
							className="h-8 w-56"
							placeholder={provider.defaultModel}
							value={prefs.llm.models[provider.id] ?? ""}
							onChange={(e) => setModel(e.target.value)}
						/>
					</div>
					{provider.needsApiKey && (
						<ApiKeyRow
							key={provider.id}
							inputId={ids.key}
							providerId={provider.id}
							help={provider.apiKeyHelp}
						/>
					)}
					<TestRow key={`test-${provider.id}`} providerId={provider.id} />
				</>
			)}
		</div>
	);
}

function ApiKeyRow({
	inputId,
	providerId,
	help,
}: {
	inputId: string;
	providerId: string;
	help?: { label: string; url: string };
}) {
	const saved = useQuery(llmQueries.savedKeys());
	const save = useSaveLlmKey();
	const remove = useDeleteLlmKey();
	const [draft, setDraft] = useState("");
	const hasKey = saved.data?.includes(providerId) ?? false;

	const submit = (event: React.FormEvent) => {
		event.preventDefault();
		if (!draft.trim()) return;
		save.mutate(
			{ providerId, apiKey: draft },
			{ onSuccess: () => setDraft("") },
		);
	};

	return (
		<div className="flex items-start gap-4 p-4">
			<div className="min-w-0 flex-1">
				<label htmlFor={inputId} className="text-sm font-medium">
					API key
				</label>
				<p className="mt-0.5 text-sm text-muted-foreground">
					{hasKey
						? "Saved, encrypted on this computer. Enter a new one to replace it."
						: "Stored encrypted on this computer."}
					{help && (
						<>
							{" "}
							<a
								href={help.url}
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-0.5 underline"
							>
								{help.label}
								<ExternalLink className="size-3" />
							</a>
						</>
					)}
				</p>
				{(save.error || remove.error) && (
					<p className="mt-1 text-xs text-destructive">
						{(save.error ?? remove.error)?.message}
					</p>
				)}
			</div>
			<form onSubmit={submit} className="flex items-center gap-2">
				<Input
					id={inputId}
					type="password"
					autoComplete="off"
					className="h-8 w-48"
					placeholder={hasKey ? "••••••••" : "Paste key"}
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
				/>
				<Button
					type="submit"
					size="sm"
					className="h-8"
					disabled={!draft.trim() || save.isPending}
				>
					Save
				</Button>
				{hasKey && (
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="h-8"
						disabled={remove.isPending}
						onClick={() => remove.mutate(providerId)}
					>
						Remove
					</Button>
				)}
			</form>
		</div>
	);
}

function TestRow({ providerId }: { providerId: string }) {
	const test = useCompletion();
	return (
		<div className="flex items-start gap-4 p-4">
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium">Test the connection</p>
				<p className="mt-0.5 text-sm text-muted-foreground">
					Sends a one-line request with the model above.
				</p>
				{test.isSuccess && (
					<p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
						<Check className="size-3.5 text-green-600" />
						Works. Answer: “{test.data.slice(0, 80)}”
					</p>
				)}
				{test.error && (
					<p className="mt-1 text-xs text-destructive">{test.error.message}</p>
				)}
			</div>
			<Button
				size="sm"
				variant="outline"
				className="h-8"
				disabled={test.isPending}
				onClick={() =>
					test.mutate({
						providerId,
						system: "You are a connection test. Answer with one short word.",
						prompt: "Reply with OK.",
					})
				}
			>
				{test.isPending && <Loader2 className="animate-spin" />}
				Test
			</Button>
		</div>
	);
}
