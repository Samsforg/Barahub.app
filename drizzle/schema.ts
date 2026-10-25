import {
  boolean,
  check,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const categories = mysqlTable(
  "categories",
  {
    id: int("id").autoincrement().primaryKey(),
    slug: varchar("slug", { length: 64 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    active: boolean("active").default(true).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({ slugUnique: uniqueIndex("categories_slug_unique").on(table.slug) }),
);

export const zones = mysqlTable(
  "zones",
  {
    id: int("id").autoincrement().primaryKey(),
    commune: varchar("commune", { length: 96 }).notNull(),
    quartier: varchar("quartier", { length: 120 }).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({ zoneUnique: uniqueIndex("zones_commune_quartier_unique").on(table.commune, table.quartier) }),
);

export const services = mysqlTable(
  "services",
  {
    id: int("id").autoincrement().primaryKey(),
    categoryId: int("categoryId").notNull().references(() => categories.id),
    slug: varchar("slug", { length: 96 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description").notNull(),
    pricingMode: mysqlEnum("pricingMode", ["fixed", "quote"]).notNull(),
    fixedPriceXof: decimal("fixedPriceXof", { precision: 12, scale: 2 }),
    diagnosticRequired: boolean("diagnosticRequired").default(false).notNull(),
    durationMinutes: int("durationMinutes"),
    travelTerms: text("travelTerms"),
    excludedSupplies: text("excludedSupplies"),
    safetyNotes: text("safetyNotes"),
    active: boolean("active").default(true).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    slugUnique: uniqueIndex("services_slug_unique").on(table.slug),
    categoryIndex: index("services_category_idx").on(table.categoryId, table.active),
  }),
);

export const providerProfiles = mysqlTable(
  "providerProfiles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id),
    displayName: varchar("displayName", { length: 160 }).notNull(),
    bio: text("bio"),
    skills: text("skills"),
    verificationStatus: mysqlEnum("verificationStatus", ["pending", "verified", "suspended"]).default("pending").notNull(),
    verificationNote: text("verificationNote"),
    verifiedBy: int("verifiedBy").references(() => users.id),
    verifiedAt: timestamp("verifiedAt"),
    availabilityNotes: text("availabilityNotes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({ userUnique: uniqueIndex("provider_profiles_user_unique").on(table.userId) }),
);

export const providerZones = mysqlTable(
  "providerZones",
  {
    providerId: int("providerId").notNull().references(() => providerProfiles.id),
    zoneId: int("zoneId").notNull().references(() => zones.id),
  },
  (table) => ({ providerZoneUnique: uniqueIndex("provider_zones_unique").on(table.providerId, table.zoneId) }),
);

export const providerServices = mysqlTable(
  "providerServices",
  {
    providerId: int("providerId").notNull().references(() => providerProfiles.id),
    serviceId: int("serviceId").notNull().references(() => services.id),
  },
  (table) => ({ providerServiceUnique: uniqueIndex("provider_services_unique").on(table.providerId, table.serviceId) }),
);

export const serviceRequests = mysqlTable(
  "serviceRequests",
  {
    id: int("id").autoincrement().primaryKey(),
    reference: varchar("reference", { length: 48 }).notNull(),
    customerId: int("customerId").notNull().references(() => users.id),
    serviceId: int("serviceId").references(() => services.id),
    assignedProviderId: int("assignedProviderId").references(() => providerProfiles.id),
    description: text("description").notNull(),
    commune: varchar("commune", { length: 96 }).notNull(),
    quartier: varchar("quartier", { length: 120 }).notNull(),
    landmark: varchar("landmark", { length: 180 }),
    address: text("address"),
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),
    desiredSlot: timestamp("desiredSlot"),
    status: mysqlEnum("status", ["DRAFT", "REQUESTED", "ASSIGNED", "ACCEPTED", "QUOTE_PENDING", "QUOTE_ACCEPTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "REVIEWED", "REFUSED", "CANCELLED", "FAILED", "CLAIM_OPEN", "REFUND_PENDING", "REFUNDED"]).default("REQUESTED").notNull(),
    idempotencyKey: varchar("idempotencyKey", { length: 96 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    referenceUnique: uniqueIndex("service_requests_reference_unique").on(table.reference),
    customerIdempotencyUnique: uniqueIndex("service_requests_customer_idempotency_unique").on(table.customerId, table.idempotencyKey),
    customerStatusIndex: index("service_requests_customer_status_idx").on(table.customerId, table.status, table.createdAt),
    providerStatusIndex: index("service_requests_provider_status_idx").on(table.assignedProviderId, table.status, table.updatedAt),
    coordinatesPairCheck: check("service_requests_coordinates_pair_chk", sql`(${table.latitude} IS NULL AND ${table.longitude} IS NULL) OR (${table.latitude} IS NOT NULL AND ${table.longitude} IS NOT NULL AND ${table.latitude} BETWEEN -90 AND 90 AND ${table.longitude} BETWEEN -180 AND 180)`),
  }),
);

export const quotes = mysqlTable(
  "quotes",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull().references(() => serviceRequests.id),
    providerId: int("providerId").notNull().references(() => providerProfiles.id),
    amountXof: decimal("amountXof", { precision: 12, scale: 2 }).notNull(),
    travelFeeXof: decimal("travelFeeXof", { precision: 12, scale: 2 }).notNull(),
    totalXof: decimal("totalXof", { precision: 12, scale: 2 }).notNull(),
    note: text("note"),
    status: mysqlEnum("status", ["proposed", "accepted", "rejected", "expired"]).default("proposed").notNull(),
    idempotencyKey: varchar("idempotencyKey", { length: 96 }).notNull(),
    acceptedAt: timestamp("acceptedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    providerIdempotencyUnique: uniqueIndex("quotes_provider_idempotency_unique").on(table.providerId, table.idempotencyKey),
    requestStatusIndex: index("quotes_request_status_idx").on(table.requestId, table.status, table.createdAt),
  }),
);

export const payments = mysqlTable(
  "payments",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull().references(() => serviceRequests.id),
    payerUserId: int("payerUserId").notNull().references(() => users.id),
    amountXof: decimal("amountXof", { precision: 12, scale: 2 }).notNull(),
    method: mysqlEnum("method", ["cash", "mobile_money", "external"]).notNull(),
    status: mysqlEnum("status", ["declared", "confirmed", "failed", "refunded"]).default("declared").notNull(),
    commissionRateBps: int("commissionRateBps").notNull(),
    commissionXof: decimal("commissionXof", { precision: 12, scale: 2 }).notNull(),
    providerNetXof: decimal("providerNetXof", { precision: 12, scale: 2 }).notNull(),
    idempotencyKey: varchar("idempotencyKey", { length: 96 }).notNull(),
    confirmedBy: int("confirmedBy").references(() => users.id),
    confirmedAt: timestamp("confirmedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    payerIdempotencyUnique: uniqueIndex("payments_payer_idempotency_unique").on(table.payerUserId, table.idempotencyKey),
    requestStatusIndex: index("payments_request_status_idx").on(table.requestId, table.status, table.createdAt),
  }),
);

export const appointments = mysqlTable(
  "appointments",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull().references(() => serviceRequests.id),
    providerId: int("providerId").notNull().references(() => providerProfiles.id),
    startsAt: timestamp("startsAt").notNull(),
    endsAt: timestamp("endsAt").notNull(),
    status: mysqlEnum("status", ["confirmed", "cancelled"]).default("confirmed").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    requestUnique: uniqueIndex("appointments_request_unique").on(table.requestId),
    providerStartUnique: uniqueIndex("appointments_provider_start_unique").on(table.providerId, table.startsAt),
    providerWindowIndex: index("appointments_provider_window_idx").on(table.providerId, table.status, table.startsAt, table.endsAt),
  }),
);

export const missionResponses = mysqlTable(
  "missionResponses",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull().references(() => serviceRequests.id),
    providerId: int("providerId").notNull().references(() => providerProfiles.id),
    decision: mysqlEnum("decision", ["accepted", "refused"]).notNull(),
    reason: varchar("reason", { length: 500 }),
    idempotencyKey: varchar("idempotencyKey", { length: 96 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    providerRequestUnique: uniqueIndex("mission_responses_provider_request_unique").on(table.providerId, table.requestId),
    providerIdempotencyUnique: uniqueIndex("mission_responses_provider_idempotency_unique").on(table.providerId, table.idempotencyKey),
    requestIndex: index("mission_responses_request_idx").on(table.requestId, table.createdAt),
  }),
);

export const reviews = mysqlTable(
  "reviews",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull().references(() => serviceRequests.id),
    customerId: int("customerId").notNull().references(() => users.id),
    providerId: int("providerId").notNull().references(() => providerProfiles.id),
    rating: int("rating").notNull(),
    comment: text("comment"),
    status: mysqlEnum("status", ["published", "flagged", "hidden"]).default("published").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    requestUnique: uniqueIndex("reviews_request_unique").on(table.requestId),
    providerStatusIndex: index("reviews_provider_status_idx").on(table.providerId, table.status, table.createdAt),
    customerIndex: index("reviews_customer_idx").on(table.customerId, table.createdAt),
    ratingRange: check("reviews_rating_range", sql`${table.rating} between 1 and 5`),
  }),
);

export const reviewReports = mysqlTable(
  "reviewReports",
  {
    id: int("id").autoincrement().primaryKey(),
    reviewId: int("reviewId").notNull().references(() => reviews.id),
    reporterId: int("reporterId").notNull().references(() => users.id),
    reason: varchar("reason", { length: 160 }).notNull(),
    details: text("details"),
    status: mysqlEnum("status", ["open", "resolved", "dismissed"]).default("open").notNull(),
    resolutionNote: text("resolutionNote"),
    resolvedBy: int("resolvedBy").references(() => users.id),
    resolvedAt: timestamp("resolvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    reporterReviewUnique: uniqueIndex("review_reports_reporter_review_unique").on(table.reviewId, table.reporterId),
    statusIndex: index("review_reports_status_idx").on(table.status, table.createdAt),
  }),
);

export const complaints = mysqlTable(
  "complaints",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull().references(() => serviceRequests.id),
    customerId: int("customerId").notNull().references(() => users.id),
    subject: varchar("subject", { length: 180 }).notNull(),
    description: text("description").notNull(),
    status: mysqlEnum("status", ["open", "in_progress", "resolved", "dismissed"]).default("open").notNull(),
    previousRequestStatus: varchar("previousRequestStatus", { length: 32 }),
    resolutionNote: text("resolutionNote"),
    resolvedBy: int("resolvedBy").references(() => users.id),
    resolvedAt: timestamp("resolvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    requestStatusIndex: index("complaints_request_status_idx").on(table.requestId, table.status, table.createdAt),
    customerIndex: index("complaints_customer_idx").on(table.customerId, table.createdAt),
  }),
);

export const refunds = mysqlTable(
  "refunds",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull().references(() => serviceRequests.id),
    paymentId: int("paymentId").notNull().references(() => payments.id),
    amountXof: decimal("amountXof", { precision: 12, scale: 2 }).notNull(),
    reason: text("reason").notNull(),
    status: mysqlEnum("status", ["pending", "completed", "rejected"]).default("pending").notNull(),
    previousRequestStatus: varchar("previousRequestStatus", { length: 32 }),
    processedBy: int("processedBy").references(() => users.id),
    processedAt: timestamp("processedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    paymentUnique: uniqueIndex("refunds_payment_unique").on(table.paymentId),
    requestStatusIndex: index("refunds_request_status_idx").on(table.requestId, table.status, table.createdAt),
  }),
);

export const adminAuditLogs = mysqlTable(
  "adminAuditLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    adminUserId: int("adminUserId").notNull().references(() => users.id),
    action: varchar("action", { length: 96 }).notNull(),
    entityType: varchar("entityType", { length: 64 }).notNull(),
    entityId: int("entityId").notNull(),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    entityIndex: index("admin_audit_entity_idx").on(table.entityType, table.entityId, table.createdAt),
    adminIndex: index("admin_audit_admin_idx").on(table.adminUserId, table.createdAt),
  }),
);

export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id),
    type: mysqlEnum("type", ["new_mission", "mission_update", "new_review", "review_published", "message", "system"]).notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    body: text("body").notNull(),
    reference: varchar("reference", { length: 96 }),
    dedupeKey: varchar("dedupeKey", { length: 160 }).notNull(),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userDedupeUnique: uniqueIndex("notifications_user_dedupe_unique").on(table.userId, table.dedupeKey),
    userReadIndex: index("notifications_user_read_idx").on(table.userId, table.readAt, table.createdAt),
  }),
);

export const messages = mysqlTable(
  "messages",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull().references(() => serviceRequests.id),
    senderId: int("senderId").notNull().references(() => users.id),
    recipientId: int("recipientId").notNull().references(() => users.id),
    body: text("body").notNull(),
    idempotencyKey: varchar("idempotencyKey", { length: 96 }).notNull(),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    senderIdempotencyUnique: uniqueIndex("messages_sender_idempotency_unique").on(table.senderId, table.idempotencyKey),
    requestCreatedIndex: index("messages_request_created_idx").on(table.requestId, table.createdAt),
    recipientReadIndex: index("messages_recipient_read_idx").on(table.recipientId, table.readAt, table.createdAt),
  }),
);

export const providerLocations = mysqlTable(
  "providerLocations",
  {
    id: int("id").autoincrement().primaryKey(),
    providerId: int("providerId").notNull().references(() => providerProfiles.id),
    requestId: int("requestId").notNull().references(() => serviceRequests.id),
    latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
    longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
    accuracy: decimal("accuracy", { precision: 8, scale: 2 }),
    sharingStatus: mysqlEnum("sharingStatus", ["shared", "paused"]).default("shared").notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    requestUnique: uniqueIndex("provider_locations_request_unique").on(table.requestId),
    providerUpdatedIndex: index("provider_locations_provider_updated_idx").on(table.providerId, table.updatedAt),
    sharingStatusIndex: index("provider_locations_status_idx").on(table.sharingStatus, table.updatedAt),
    coordinatesCheck: check("provider_locations_coordinates_chk", sql`${table.latitude} BETWEEN -90 AND 90 AND ${table.longitude} BETWEEN -180 AND 180 AND (${table.accuracy} IS NULL OR ${table.accuracy} BETWEEN 0 AND 10000)`),
  }),
);

export const requestStatusHistory = mysqlTable(
  "requestStatusHistory",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull().references(() => serviceRequests.id),
    fromStatus: varchar("fromStatus", { length: 32 }),
    toStatus: varchar("toStatus", { length: 32 }).notNull(),
    actorUserId: int("actorUserId").notNull().references(() => users.id),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({ requestIndex: index("request_status_history_request_idx").on(table.requestId, table.createdAt) }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Zone = typeof zones.$inferSelect;
export type ProviderProfile = typeof providerProfiles.$inferSelect;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type MissionResponse = typeof missionResponses.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type ReviewReport = typeof reviewReports.$inferSelect;
export type Complaint = typeof complaints.$inferSelect;
export type Refund = typeof refunds.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type ProviderLocation = typeof providerLocations.$inferSelect;
