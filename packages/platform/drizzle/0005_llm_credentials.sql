CREATE TABLE `llm_credentials` (
	`provider_id` text PRIMARY KEY NOT NULL,
	`api_key` text NOT NULL,
	`updated_at` integer NOT NULL
);
