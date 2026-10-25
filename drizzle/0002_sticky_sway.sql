CREATE TABLE `missionResponses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`providerId` int NOT NULL,
	`decision` enum('accepted','refused') NOT NULL,
	`reason` varchar(500),
	`idempotencyKey` varchar(96) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `missionResponses_id` PRIMARY KEY(`id`),
	CONSTRAINT `mission_responses_provider_request_unique` UNIQUE(`providerId`,`requestId`),
	CONSTRAINT `mission_responses_provider_idempotency_unique` UNIQUE(`providerId`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `providerServices` (
	`providerId` int NOT NULL,
	`serviceId` int NOT NULL,
	CONSTRAINT `provider_services_unique` UNIQUE(`providerId`,`serviceId`)
);
--> statement-breakpoint
ALTER TABLE `serviceRequests` MODIFY COLUMN `status` enum('DRAFT','REQUESTED','ASSIGNED','ACCEPTED','QUOTE_PENDING','QUOTE_ACCEPTED','SCHEDULED','IN_PROGRESS','COMPLETED','REVIEWED','REFUSED','CANCELLED','FAILED','CLAIM_OPEN','REFUND_PENDING','REFUNDED') NOT NULL DEFAULT 'REQUESTED';--> statement-breakpoint
ALTER TABLE `missionResponses` ADD CONSTRAINT `missionResponses_requestId_serviceRequests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `serviceRequests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `missionResponses` ADD CONSTRAINT `missionResponses_providerId_providerProfiles_id_fk` FOREIGN KEY (`providerId`) REFERENCES `providerProfiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `providerServices` ADD CONSTRAINT `providerServices_providerId_providerProfiles_id_fk` FOREIGN KEY (`providerId`) REFERENCES `providerProfiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `providerServices` ADD CONSTRAINT `providerServices_serviceId_services_id_fk` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `mission_responses_request_idx` ON `missionResponses` (`requestId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `service_requests_provider_status_idx` ON `serviceRequests` (`assignedProviderId`,`status`,`updatedAt`);