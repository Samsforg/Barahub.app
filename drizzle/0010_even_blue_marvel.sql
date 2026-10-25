CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`payerUserId` int NOT NULL,
	`amountXof` decimal(12,2) NOT NULL,
	`method` enum('cash','mobile_money','external') NOT NULL,
	`status` enum('declared','confirmed','failed','refunded') NOT NULL DEFAULT 'declared',
	`commissionRateBps` int NOT NULL,
	`commissionXof` decimal(12,2) NOT NULL,
	`providerNetXof` decimal(12,2) NOT NULL,
	`idempotencyKey` varchar(96) NOT NULL,
	`confirmedBy` int,
	`confirmedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_payer_idempotency_unique` UNIQUE(`payerUserId`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`providerId` int NOT NULL,
	`amountXof` decimal(12,2) NOT NULL,
	`travelFeeXof` decimal(12,2) NOT NULL,
	`totalXof` decimal(12,2) NOT NULL,
	`note` text,
	`status` enum('proposed','accepted','rejected','expired') NOT NULL DEFAULT 'proposed',
	`idempotencyKey` varchar(96) NOT NULL,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotes_id` PRIMARY KEY(`id`),
	CONSTRAINT `quotes_provider_idempotency_unique` UNIQUE(`providerId`,`idempotencyKey`)
);
--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_requestId_serviceRequests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `serviceRequests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_payerUserId_users_id_fk` FOREIGN KEY (`payerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_confirmedBy_users_id_fk` FOREIGN KEY (`confirmedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotes` ADD CONSTRAINT `quotes_requestId_serviceRequests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `serviceRequests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotes` ADD CONSTRAINT `quotes_providerId_providerProfiles_id_fk` FOREIGN KEY (`providerId`) REFERENCES `providerProfiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `payments_request_status_idx` ON `payments` (`requestId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `quotes_request_status_idx` ON `quotes` (`requestId`,`status`,`createdAt`);