import {
	REDIRECT_URI_PLACEHOLDER,
	type SetupGuide,
} from "@dashboard/core/integration";

export const sentrySetupGuide: SetupGuide = {
	steps: [
		{
			title: "Create an API application",
			text: "In Sentry, open User Settings → API → Applications and click “Create New Application”.",
			links: [
				{
					label: "API applications",
					url: "https://sentry.io/settings/account/api/applications/",
				},
			],
		},
		{
			title: "Name it and set the redirect URI",
			text: "Paste this into “Authorized Redirect URIs” (it must match exactly) and save.",
			copy: [
				{ label: "Name", value: "Productivity Dashboard" },
				{ label: "Authorized Redirect URI", value: REDIRECT_URI_PLACEHOLDER },
			],
		},
		{
			title: "Copy the credentials",
			text: "Copy the Client ID and Client Secret from the application's page.",
		},
	],
};
