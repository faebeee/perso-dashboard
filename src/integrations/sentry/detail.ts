import {
	type SentryEvent,
	type SentryIssue,
	sentryExceptionDataSchema,
} from "./api/schemas";

/** Tags shown first when present; the rest follow alphabetically. */
const KEY_TAGS = [
	"environment",
	"release",
	"browser",
	"os",
	"url",
	"handled",
	"level",
];
const TAG_LIMIT = 12;

export interface StackFrame {
	function: string;
	file: string;
	line?: number;
	column?: number;
	inApp: boolean;
	/** Code around the line (only kept for in-app frames). */
	context: { line: number; code: string; current: boolean }[];
}

export interface SentryErrorDetail {
	title: string;
	culprit?: string;
	level: string;
	status: string;
	substatus?: string;
	project: string;
	url: string;
	events: number;
	users: number;
	firstSeen: string;
	lastSeen: string;
	assignee?: string;
	/** From the latest event. */
	latest?: {
		at?: string;
		message?: string;
		user?: string;
		exceptions: {
			type: string;
			value?: string;
			handled?: boolean;
			/** Most recent call first. */
			frames: StackFrame[];
		}[];
		tags: { key: string; value: string }[];
	};
}

function toFrames(
	frames: NonNullable<
		NonNullable<
			ReturnType<
				typeof sentryExceptionDataSchema.parse
			>["values"][number]["stacktrace"]
		>["frames"]
	>,
): StackFrame[] {
	// Sentry lists frames oldest first; readers want the crash site on top.
	return [...frames].reverse().map((f) => ({
		function: f.function ?? "<anonymous>",
		file: f.filename ?? f.absPath ?? f.module ?? "<unknown>",
		line: f.lineNo ?? undefined,
		column: f.colNo ?? undefined,
		inApp: f.inApp ?? false,
		context: f.inApp
			? f.context.map(([line, code]) => ({
					line,
					code: code ?? "",
					current: line === f.lineNo,
				}))
			: [],
	}));
}

/** Pure: Sentry issue + latest event → detail view model. */
export function toErrorDetail(
	issue: SentryIssue,
	event: SentryEvent | null,
): SentryErrorDetail {
	const exceptionEntry = event?.entries.find((e) => e.type === "exception");
	const parsed = exceptionEntry
		? sentryExceptionDataSchema.safeParse(exceptionEntry.data)
		: undefined;
	const exceptions = (parsed?.success ? parsed.data.values : [])
		// Chained exceptions: the last one is the one that was raised.
		.slice()
		.reverse()
		.map((value) => ({
			type: value.type ?? "Error",
			value: value.value ?? undefined,
			handled: value.mechanism?.handled ?? undefined,
			frames: toFrames(value.stacktrace?.frames ?? []),
		}));

	const tags = [...(event?.tags ?? [])]
		.sort((a, b) => {
			const ia = KEY_TAGS.indexOf(a.key);
			const ib = KEY_TAGS.indexOf(b.key);
			if (ia !== ib) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
			return a.key.localeCompare(b.key);
		})
		.slice(0, TAG_LIMIT);

	return {
		title: issue.title,
		culprit: issue.culprit ?? undefined,
		level: issue.level,
		status: issue.status,
		substatus: issue.substatus ?? undefined,
		project: issue.project.name,
		url: issue.permalink,
		events: Number(issue.count),
		users: issue.userCount,
		firstSeen: issue.firstSeen,
		lastSeen: issue.lastSeen,
		assignee: issue.assignedTo
			? `${issue.assignedTo.type === "team" ? "#" : ""}${issue.assignedTo.name}`
			: undefined,
		latest: event
			? {
					at: event.dateCreated,
					message: event.message ?? undefined,
					user:
						event.user?.email ??
						event.user?.username ??
						event.user?.id ??
						undefined,
					exceptions,
					tags,
				}
			: undefined,
	};
}
