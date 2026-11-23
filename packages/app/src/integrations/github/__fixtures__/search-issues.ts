/** Trimmed real-world shape of GET /search/issues. */
export const searchIssuesFixture = {
	total_count: 2,
	incomplete_results: false,
	items: [
		{
			id: 2001,
			node_id: "PR_1",
			number: 42,
			title: "Add dark mode",
			html_url: "https://github.com/acme/web/pull/42",
			repository_url: "https://api.github.com/repos/acme/web",
			updated_at: "2026-01-02T10:00:00Z",
			state: "open",
			draft: true,
			user: {
				login: "octocat",
				avatar_url: "https://avatars.githubusercontent.com/u/1",
			},
			labels: [{ id: 1, name: "ui" }],
			pull_request: { url: "https://api.github.com/repos/acme/web/pulls/42" },
		},
		{
			id: 2002,
			node_id: "PR_2",
			number: 7,
			title: "Fix flaky test",
			html_url: "https://github.com/acme/api/pull/7",
			repository_url: "https://api.github.com/repos/acme/api",
			updated_at: "2026-01-01T09:00:00Z",
			state: "open",
			user: null,
			labels: [],
			pull_request: { url: "https://api.github.com/repos/acme/api/pulls/7" },
		},
	],
};
