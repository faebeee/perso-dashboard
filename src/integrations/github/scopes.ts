/**
 * GitHub OAuth scopes are hierarchical: a parent scope includes its
 * children, and GitHub reports only the parent back (e.g. a token with
 * `repo` can read Dependabot alerts although `security_events` isn't
 * listed). https://docs.github.com/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps
 */
const PARENT: Record<string, string> = {
	"repo:status": "repo",
	repo_deployment: "repo",
	public_repo: "repo",
	"repo:invite": "repo",
	security_events: "repo",
	"read:user": "user",
	"user:email": "user",
	"user:follow": "user",
	"read:org": "admin:org",
	"write:org": "admin:org",
};

/** Pure: does the granted set include `needed`, directly or via a parent? */
export function hasGitHubScope(
	granted: readonly string[],
	needed: string,
): boolean {
	for (let scope: string | undefined = needed; scope; scope = PARENT[scope]) {
		if (granted.includes(scope)) return true;
	}
	return false;
}
