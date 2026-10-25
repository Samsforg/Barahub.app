CREATE TABLE `adminAuditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminUserId` int NOT NULL,
	`action` varchar(96) NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminAuditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviewReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reviewId` int NOT NULL,
	`reporterId` int NOT NULL,
	`reason` varchar(160) NOT NULL,
	`details` text,
	`status` enum('open','resolved','dismissed') NOT NULL DEFAULT 'open',
	`resolutionNote` text,
	`resolvedBy` int,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviewReports_id` PRIMARY KEY(`id`),
	CONSTRAINT `review_reports_reporter_review_unique` UNIQUE(`reviewId`,`reporterId`)
);
--> statement-breakpoint
ALTER TABLE `adminAuditLogs` ADD CONSTRAINT `adminAuditLogs_adminUserId_users_id_fk` FOREIGN KEY (`adminUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviewReports` ADD CONSTRAINT `reviewReports_reviewId_reviews_id_fk` FOREIGN KEY (`reviewId`) REFERENCES `reviews`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviewReports` ADD CONSTRAINT `reviewReports_reporterId_users_id_fk` FOREIGN KEY (`reporterId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviewReports` ADD CONSTRAINT `reviewReports_resolvedBy_users_id_fk` FOREIGN KEY (`resolvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `admin_audit_entity_idx` ON `adminAuditLogs` (`entityType`,`entityId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_audit_admin_idx` ON `adminAuditLogs` (`adminUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `review_reports_status_idx` ON `reviewReports` (`status`,`createdAt`);