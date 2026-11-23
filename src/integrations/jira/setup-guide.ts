import { REDIRECT_URI_PLACEHOLDER, type SetupGuide } from "#/core/integration";

export const jiraSetupGuide: SetupGuide = {
	steps: [
		{
			title: "Create an OAuth 2.0 app",
			text: "Open the Atlassian Developer Console, click Create → “OAuth 2.0 integration”, give it a name and accept the terms.",
			links: [
				{
					label: "Developer Console",
					url: "https://developer.atlassian.com/console/myapps/",
				},
			],
		},
		{
			title: "Add Jira permissions",
			text: "Open Permissions, click Add next to “Jira API”, then Configure → Edit scopes and enable these classic scopes. (Offline access is requested automatically when you connect.)",
			copy: [{ label: "Scopes", value: "read:jira-work read:jira-user" }],
		},
		{
			title: "Set the callback URL",
			text: "Open Authorization, click Add next to “OAuth 2.0 (3LO)” and paste this callback URL. It must match exactly, including the port.",
			copy: [{ label: "Callback URL", value: REDIRECT_URI_PLACEHOLDER }],
		},
		{
			title: "Copy the credentials",
			text: "Open Settings and copy the Client ID and the Secret.",
		},
	],
};
