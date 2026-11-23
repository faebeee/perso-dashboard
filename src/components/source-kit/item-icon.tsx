import {
	CalendarDays,
	CalendarPlus,
	CircleDot,
	GitPullRequest,
	GitPullRequestArrow,
	Mail,
	Tag,
	UserCheck,
	Video,
} from "lucide-react";
import type { ComponentType, CSSProperties } from "react";
import type { WorkItemKind } from "#/core/work-item";
import { cn } from "#/lib/utils";
import { useSource } from "./source-context";

/** Every kind of row the app renders, across all lists. */
export type ItemKind =
	| WorkItemKind
	| "event"
	| "invitation"
	| "meeting"
	| "release";

export const ITEM_KINDS: Record<
	ItemKind,
	{ label: string; icon: ComponentType<{ className?: string }> }
> = {
	pull_request: { label: "Pull request", icon: GitPullRequest },
	assigned_pull_request: { label: "Assigned pull request", icon: UserCheck },
	review_request: { label: "Review request", icon: GitPullRequestArrow },
	issue: { label: "Issue", icon: CircleDot },
	email: { label: "Email", icon: Mail },
	event: { label: "Event", icon: CalendarDays },
	invitation: { label: "Invitation", icon: CalendarPlus },
	meeting: { label: "Meeting", icon: Video },
	release: { label: "Release", icon: Tag },
};

interface ItemIconProps {
	/** Integration id, e.g. "jira". */
	source: string;
	kind: ItemKind;
	className?: string;
}

/**
 * Leading tile for a list row: the glyph says *what* it is (PR, issue,
 * email…), the tint says *where* it's from. Hover for "Jira · Issue".
 */
export function ItemIcon({ source, kind, className }: ItemIconProps) {
	const info = useSource(source);
	const { label, icon: Icon } = ITEM_KINDS[kind];
	const description = `${info?.name ?? source} · ${label}`;
	const style = info?.accent
		? ({
				color: info.accent,
				backgroundColor: `color-mix(in oklab, ${info.accent} 14%, transparent)`,
			} satisfies CSSProperties)
		: undefined;

	return (
		<span
			className={cn(
				"grid size-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground",
				className,
			)}
			style={style}
			title={description}
		>
			<Icon className="size-4" />
			<span className="sr-only">{description}</span>
		</span>
	);
}
