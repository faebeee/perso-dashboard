import { REDIRECT_URI_PLACEHOLDER, type SetupGuide } from "#/core/integration";

export const githubSetupGuide: SetupGuide = {
	steps: [
		{
			title: "Create an OAuth App",
			text: "In GitHub, open Settings → Developer settings → OAuth Apps and click “New OAuth App”.",
			links: [
				{
					label: "New OAuth App",
					url: "https://github.com/settings/applications/new",
				},
			],
		},
		{
			title: "Fill in the form",
			text: "Use these values, leave “Enable Device Flow” unchecked, then click “Register application”.",
			copy: [
				{ label: "Application name", value: "Productivity Dashboard" },
				{ label: "Homepage URL", value: "http://127.0.0.1" },
				{
					label: "Authorization callback URL",
					value: REDIRECT_URI_PLACEHOLDER,
				},
			],
		},
		{
			title: "Create a client secret",
			text: "On the app's page, copy the Client ID. Then click “Generate a new client secret” and copy it right away: GitHub shows it only once.",
		},
	],
};
