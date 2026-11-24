CREATE TABLE `ai_summaries` (
	`key` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`text` text NOT NULL,
	`provider_id` text NOT NULL,
	`model` text NOT NULL,
	`created_at` integer NOT NULL
);
