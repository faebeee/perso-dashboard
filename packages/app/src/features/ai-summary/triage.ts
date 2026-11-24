import { getServices } from "@dashboard/platform/services";
import { z } from "zod";
import { chosenLlm, completeJson, summaryKey } from "./fetchers";

/** What triage looks at: only what the list already shows. */
export interface TriageItem {
	id: string;
	/** "github", "gmail"… */
	source: string;
	/** "pull_request", "email", "overdue"… */
	kind: string;
	title: string;
	context?: string;
	status?: string;
	tags?: readonly string[];
	from?: string;
	/** Why it's listed ("Waiting 2 days", "Due today"). */
	label?: string;
	/** Changes when the item changes (updatedAt). */
	version?: string;
}

export const TRIAGE_ACTIONS = [
	"reply",
	"review",
	"fix",
	"decide",
	"delegate",
	"later",
	"ignore",
] as const;

export interface TriageResult {
	gist: string;
	action: (typeof TRIAGE_ACTIONS)[number];
	reason: string;
}

/** Items per request: keeps prompts short and answers reliable. */
export const TRIAGE_BATCH = 40;

export const TRIAGE_SYSTEM_PROMPT = [
	"You triage a software developer's inbox of work items: pull requests, review requests, issues, emails, errors, alerts.",
	"For every item, write a gist (one line, at most 12 words, what it is about and what is asked), pick the next action and give a short reason (at most 15 words).",
	`Actions: reply (an answer is expected), review (code or a document to review), fix (something is broken or failing), decide (a choice or approval is needed), delegate (someone else should handle it), later (no hurry), ignore (newsletter, FYI, noise).`,
	"Use only the given fields. Keep ticket keys and PR numbers. Write in the language of the item.",
	"Return every id exactly once.",
].join("\n");

const answerSchema = z.object({
	items: z.array(
		z.object({
			id: z.string(),
			gist: z.string(),
			action: z.enum(TRIAGE_ACTIONS),
			reason: z.string(),
		}),
	),
});

const storedSchema = z.object({
	gist: z.string(),
	action: z.enum(TRIAGE_ACTIONS),
	reason: z.string(),
});

/** Pure: the item as the model sees it; also what its stored result is keyed by. */
export function fingerprint(item: TriageItem): string {
	return JSON.stringify({
		id: item.id,
		source: item.source,
		kind: item.kind,
		title: item.title,
		context: item.context,
		status: item.status,
		tags: item.tags,
		from: item.from,
		label: item.label,
		version: item.version,
	});
}

/** Pure: the prompt for one batch. */
export function triagePrompt(items: readonly TriageItem[]): string {
	return `Items (JSON lines):\n${items.map(fingerprint).join("\n")}`;
}

const keyOf = (item: TriageItem) => {
	const chosen = chosenLlm();
	if (!chosen) return Promise.resolve(null);
	return summaryKey({
		providerId: chosen.provider.id,
		model: chosen.model,
		system: TRIAGE_SYSTEM_PROMPT,
		prompt: fingerprint(item),
	});
};

/** Stored results of these items (unchanged items only): no model call. */
export async function loadTriage(
	items: readonly TriageItem[],
): Promise<Map<string, TriageResult>> {
	const results = new Map<string, TriageResult>();
	if (!chosenLlm()) return results;
	const { aiSummaries } = await getServices();
	await Promise.all(
		items.map(async (item) => {
			const key = await keyOf(item);
			const stored = key ? await aiSummaries.get(key) : null;
			if (!stored) return;
			try {
				const parsed = storedSchema.safeParse(JSON.parse(stored.text));
				if (parsed.success) results.set(item.id, parsed.data);
			} catch {
				// unreadable: triage it again
			}
		}),
	);
	return results;
}

/**
 * Triages the items without a stored result, in batches, and stores each
 * answer. Returns how many items were sent to the model.
 */
export async function runTriage(
	items: readonly TriageItem[],
	signal?: AbortSignal,
): Promise<number> {
	const chosen = chosenLlm();
	if (!chosen) return 0;
	const known = await loadTriage(items);
	const open = items.filter((item) => !known.has(item.id));
	const { aiSummaries } = await getServices();
	for (let i = 0; i < open.length; i += TRIAGE_BATCH) {
		const batch = open.slice(i, i + TRIAGE_BATCH);
		const answer = await completeJson(
			{ system: TRIAGE_SYSTEM_PROMPT, prompt: triagePrompt(batch), signal },
			"triage",
			answerSchema,
		);
		const byId = new Map(batch.map((item) => [item.id, item]));
		await Promise.all(
			answer.items.map(async ({ id, ...result }) => {
				const item = byId.get(id);
				const key = item ? await keyOf(item) : null;
				if (!item || !key) return; // an id the model made up
				await aiSummaries.save({
					key,
					scope: `triage|${id}`,
					text: JSON.stringify(result),
					providerId: chosen.provider.id,
					model: chosen.model,
				});
			}),
		);
	}
	return open.length;
}
