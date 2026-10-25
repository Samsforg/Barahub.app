CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`active` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `providerProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(160) NOT NULL,
	`bio` text,
	`skills` text,
	`verificationStatus` enum('pending','verified','suspended') NOT NULL DEFAULT 'pending',
	`availabilityNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `providerProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `provider_profiles_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `providerZones` (
	`providerId` int NOT NULL,
	`zoneId` int NOT NULL,
	CONSTRAINT `provider_zones_unique` UNIQUE(`providerId`,`zoneId`)
);
--> statement-breakpoint
CREATE TABLE `requestStatusHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`fromStatus` varchar(32),
	`toStatus` varchar(32) NOT NULL,
	`actorUserId` int NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `requestStatusHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `serviceRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reference` varchar(48) NOT NULL,
	`customerId` int NOT NULL,
	`serviceId` int,
	`assignedProviderId` int,
	`description` text NOT NULL,
	`commune` varchar(96) NOT NULL,
	`quartier` varchar(120) NOT NULL,
	`landmark` varchar(180),
	`address` text,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`desiredSlot` timestamp,
	`status` enum('DRAFT','REQUESTED','ASSIGNED','QUOTE_PENDING','QUOTE_ACCEPTED','SCHEDULED','IN_PROGRESS','COMPLETED','REVIEWED','REFUSED','CANCELLED','FAILED','CLAIM_OPEN','REFUND_PENDING','REFUNDED') NOT NULL DEFAULT 'REQUESTED',
	`idempotencyKey` varchar(96) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `serviceRequests_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_requests_reference_unique` UNIQUE(`reference`),
	CONSTRAINT `service_requests_customer_idempotency_unique` UNIQUE(`customerId`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`slug` varchar(96) NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` text NOT NULL,
	`pricingMode` enum('fixed','quote') NOT NULL,
	`fixedPriceXof` decimal(12,2),
	`diagnosticRequired` boolean NOT NULL DEFAULT false,
	`durationMinutes` int,
	`travelTerms` text,
	`excludedSupplies` text,
	`safetyNotes` text,
	`active` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `services_id` PRIMARY KEY(`id`),
	CONSTRAINT `services_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `zones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`commune` varchar(96) NOT NULL,
	`quartier` varchar(120) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `zones_id` PRIMARY KEY(`id`),
	CONSTRAINT `zones_commune_quartier_unique` UNIQUE(`commune`,`quartier`)
);
--> statement-breakpoint
ALTER TABLE `providerProfiles` ADD CONSTRAINT `providerProfiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `providerZones` ADD CONSTRAINT `providerZones_providerId_providerProfiles_id_fk` FOREIGN KEY (`providerId`) REFERENCES `providerProfiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `providerZones` ADD CONSTRAINT `providerZones_zoneId_zones_id_fk` FOREIGN KEY (`zoneId`) REFERENCES `zones`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `requestStatusHistory` ADD CONSTRAINT `requestStatusHistory_requestId_serviceRequests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `serviceRequests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `requestStatusHistory` ADD CONSTRAINT `requestStatusHistory_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `serviceRequests` ADD CONSTRAINT `serviceRequests_customerId_users_id_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `serviceRequests` ADD CONSTRAINT `serviceRequests_serviceId_services_id_fk` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `serviceRequests` ADD CONSTRAINT `serviceRequests_assignedProviderId_providerProfiles_id_fk` FOREIGN KEY (`assignedProviderId`) REFERENCES `providerProfiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `services` ADD CONSTRAINT `services_categoryId_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `request_status_history_request_idx` ON `requestStatusHistory` (`requestId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `service_requests_customer_status_idx` ON `serviceRequests` (`customerId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `services_category_idx` ON `services` (`categoryId`,`active`);