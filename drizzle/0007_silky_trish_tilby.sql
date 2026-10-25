CREATE TABLE `providerLocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`requestId` int NOT NULL,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`accuracy` decimal(8,2),
	`sharingStatus` enum('shared','paused') NOT NULL DEFAULT 'shared',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `providerLocations_id` PRIMARY KEY(`id`),
	CONSTRAINT `provider_locations_request_unique` UNIQUE(`requestId`)
);
--> statement-breakpoint
ALTER TABLE `providerLocations` ADD CONSTRAINT `providerLocations_providerId_providerProfiles_id_fk` FOREIGN KEY (`providerId`) REFERENCES `providerProfiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `providerLocations` ADD CONSTRAINT `providerLocations_requestId_serviceRequests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `serviceRequests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `provider_locations_provider_updated_idx` ON `providerLocations` (`providerId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `provider_locations_status_idx` ON `providerLocations` (`sharingStatus`,`updatedAt`);