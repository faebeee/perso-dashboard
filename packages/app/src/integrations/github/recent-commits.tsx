import { GitBranch } from "lucide-react";
import { formatRelative } from "#/lib/time";
import type { CommitInfo } from "./commits";

/** Pure: commits grouped by repo + branch, busiest (then most recent) first. */
export function groupCommits(commits: readonly CommitInfo[]) {
	const groups = new Map<
		string,
		{ repo: string; branch: string; commits: CommitInfo[] }
	>();
	for (const commit of commits) {
		const key = `${commit.repo}\n${commit.branch}`;
		const group = groups.get(key) ?? {
			repo: commit.repo,
			branch: commit.branch,
			commits: [],
		};
		group.commits.push(commit);
		groups.set(key, group);
	}
	return [...groups.values()].sort(
		(a, b) =>
			b.commits.length - a.commits.length ||
			Date.parse(b.commits[0]?.at ?? "") - Date.parse(a.commits[0]?.at ?? ""),
	);
}

/** Your recent commits by repo and branch. */
export function RecentCommits({ commits }: { commits: CommitInfo[] }) {
	return (
		<div className="space-y-4 py-2">
			{groupCommits(commits).map((group) => (
				<section
					key={`${group.repo}/${group.branch}`}
					aria-label={`${group.repo} ${group.branch}`}
				>
					<h3 className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
						{group.repo}
						<span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
							<GitBranch className="size-3.5" />
							{group.branch}
						</span>
						<span className="text-xs font-normal text-muted-foreground">
							{group.commits.length} commit
							{group.commits.length === 1 ? "" : "s"}
						</span>
					</h3>
					<ol className="mt-1 space-y-0.5">
						{group.commits.map((commit) => (
							<li key={commit.sha}>
								<a
									href={commit.url}
									target="_blank"
									rel="noreferrer"
									className="flex items-center gap-2 rounded-md px-1 py-1 text-sm text-inherit no-underline hover:bg-accent/60"
								>
									<code className="shrink-0 text-xs text-muted-foreground">
										{commit.shortSha}
									</code>
									<span className="min-w-0 flex-1 truncate">
										{commit.message}
									</span>
									<time
										dateTime={commit.at}
										className="shrink-0 text-xs text-muted-foreground"
									>
										{formatRelative(commit.at)}
									</time>
								</a>
							</li>
						))}
					</ol>
				</section>
			))}
		</div>
	);
}
