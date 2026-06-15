CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`sessionId` varchar(64) NOT NULL,
	`title` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chat_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `chat_sessions_sessionId_unique` UNIQUE(`sessionId`)
);
--> statement-breakpoint
CREATE TABLE `docking_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`queryId` int NOT NULL,
	`rank` int NOT NULL,
	`sequence` varchar(2048) NOT NULL,
	`bindingScore` float NOT NULL,
	`confidence` float NOT NULL,
	`interactionResidues` json,
	`pdbData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `docking_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `esm_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`queryId` int NOT NULL,
	`sequence` varchar(2048) NOT NULL,
	`score` float NOT NULL,
	`perplexity` float,
	`passed` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `esm_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `peptide_queries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`sessionId` varchar(64) NOT NULL,
	`sequences` json NOT NULL,
	`targetProtein` varchar(256),
	`esmThreshold` float DEFAULT 0.5,
	`confidenceThreshold` float DEFAULT 0.7,
	`enableEsmfold` boolean DEFAULT true,
	`enableDocking` boolean DEFAULT true,
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `peptide_queries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pipeline_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`queryId` int NOT NULL,
	`stepIndex` int NOT NULL,
	`stepName` varchar(128) NOT NULL,
	`status` enum('waiting','running','completed','failed') NOT NULL DEFAULT 'waiting',
	`progress` int DEFAULT 0,
	`resultData` json,
	`errorMessage` text,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pipeline_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `structure_predictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`queryId` int NOT NULL,
	`sequence` varchar(2048) NOT NULL,
	`pdbData` text,
	`plddt` float,
	`ptm` float,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `structure_predictions_id` PRIMARY KEY(`id`)
);
