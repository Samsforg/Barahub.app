CREATE TABLE `complaints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`customerId` int NOT NULL,
	`subject` varchar(180) NOT NULL,
	`description` text NOT NULL,
	`status` enum('open','in_progress','resolved','dismissed') NOT NULL DEFAULT 'open',
	`previousRequestStatus` varchar(32),
	`resolutionNote` text,
	`resolvedBy` int,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `complaints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `refunds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`paymentId` int NOT NULL,
	`amountXof` decimal(12,2) NOT NULL,
	`reason` text NOT NULL,
	`status` enum('pending','completed','rejected') NOT NULL DEFAULT 'pending',
	`previousRequestStatus` varchar(32),
	`processedBy` int,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `refunds_id` PRIMARY KEY(`id`),
	CONSTRAINT `refunds_payment_unique` UNIQUE(`paymentId`)
);
--> statement-breakpoint
ALTER TABLE `providerProfiles` ADD `verificationNote` text;--> statement-breakpoint
ALTER TABLE `providerProfiles` ADD `verifiedBy` int;--> statement-breakpoint
ALTER TABLE `providerProfiles` ADD `verifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `complaints` ADD CONSTRAINT `complaints_requestId_serviceRequests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `serviceRequests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `complaints` ADD CONSTRAINT `complaints_customerId_users_id_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `complaints` ADD CONSTRAINT `complaints_resolvedBy_users_id_fk` FOREIGN KEY (`resolvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_requestId_serviceRequests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `serviceRequests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_paymentId_payments_id_fk` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_processedBy_users_id_fk` FOREIGN KEY (`processedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `complaints_request_status_idx` ON `complaints` (`requestId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `complaints_customer_idx` ON `complaints` (`customerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `refunds_request_status_idx` ON `refunds` (`requestId`,`status`,`createdAt`);--> statement-breakpoint
ALTER TABLE `providerProfiles` ADD CONSTRAINT `providerProfiles_verifiedBy_users_id_fk` FOREIGN KEY (`verifiedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;