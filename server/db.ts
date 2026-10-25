import { and, count, desc, eq, gt, gte, inArray, isNull, like, lt, notInArray, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  adminAuditLogs,
  appointments,
  categories,
  complaints,
  InsertUser,
  missionResponses,
  messages,
  notifications,
  providerProfiles,
  refunds,
  providerLocations,
  providerServices,
  providerZones,
  payments,
  quotes,
  requestStatusHistory,
  reviewReports,
  reviews,
  services,
  serviceRequests,
  ServiceRequest,
  users,
  zones,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import {
  canCreateRefundForRequestStatus,
  canRefundPaymentStatus,
  canTransitionComplaint,
  canTransitionRefund,
  isClosedComplaintStatus,
  isComplaintEligibleStatus,
  normalizeSlug,
  refundRestoreStatus,
  validateServicePricingInput,
} from "./workflows";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch {
      console.warn("[Database] Failed to connect");
      _db = null;
    }
  }
  return _db;
}

function insertedId(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  return Number((header as { insertId?: number } | null | undefined)?.insertId);
}

async function createNotification(input: { userId: number; type: "new_mission" | "mission_update" | "new_review" | "review_published" | "message" | "system"; title: string; body: string; reference?: string; dedupeKey: string }) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(notifications).values(input).onDuplicateKeyUpdate({ set: { dedupeKey: input.dedupeKey } });
  const rows = await db.select().from(notifications).where(and(eq(notifications.userId, input.userId), eq(notifications.dedupeKey, input.dedupeKey))).limit(1);
  return rows[0] ?? null;
}

async function notifyCompatibleProviders(request: ServiceRequest) {
  const db = await getDb();
  if (!db || !request.serviceId) return;
  const providers = await db.select({ userId: users.id }).from(providerProfiles).innerJoin(users, eq(providerProfiles.userId, users.id)).innerJoin(providerServices, eq(providerServices.providerId, providerProfiles.id)).innerJoin(providerZones, eq(providerZones.providerId, providerProfiles.id)).innerJoin(zones, eq(providerZones.zoneId, zones.id)).where(and(eq(providerProfiles.verificationStatus, "verified"), eq(zones.commune, request.commune), eq(zones.quartier, request.quartier), eq(providerServices.serviceId, request.serviceId)));
  await Promise.all(providers.map((provider) => createNotification({ userId: provider.userId, type: "new_mission", title: "Nouvelle mission compatible", body: `Une demande est disponible dans ${request.commune} · ${request.quartier}.`, reference: request.reference, dedupeKey: `mission:${request.id}:provider:${provider.userId}` })));
}

export async function listNotifications(userId: number) {
  const db = await getDb();
  if (!db) return { items: [], unreadCount: 0 };
  const items = await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
  const unreadRows = await db.select({ unreadCount: count(notifications.id) }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return { items, unreadCount: Number(unreadRows[0]?.unreadCount ?? 0) };
}

export async function markNotificationRead(input: { userId: number; notificationId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, input.notificationId), eq(notifications.userId, input.userId), isNull(notifications.readAt)));
  return { success: true } as const;
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return { success: true } as const;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listCatalog(search?: string, categorySlug?: string) {
  const db = await getDb();
  if (!db) return [];
  const filters = [eq(services.active, true), eq(categories.active, true)];
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    filters.push(or(like(services.name, term), like(services.description, term))!);
  }
  if (categorySlug) filters.push(eq(categories.slug, categorySlug));
  return db
    .select({
      id: services.id,
      slug: services.slug,
      name: services.name,
      description: services.description,
      pricingMode: services.pricingMode,
      fixedPriceXof: services.fixedPriceXof,
      diagnosticRequired: services.diagnosticRequired,
      durationMinutes: services.durationMinutes,
      travelTerms: services.travelTerms,
      category: { slug: categories.slug, name: categories.name },
    })
    .from(services)
    .innerJoin(categories, eq(services.categoryId, categories.id))
    .where(and(...filters))
    .orderBy(services.sortOrder, services.name);
}

export async function listZones() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(zones).where(eq(zones.active, true)).orderBy(zones.commune, zones.quartier);
}

export async function createServiceRequest(input: {
  customerId: number;
  serviceId?: number;
  description: string;
  commune: string;
  quartier: string;
  landmark?: string;
  address?: string;
  desiredSlot?: Date;
  latitude?: number;
  longitude?: number;
  idempotencyKey: string;
}): Promise<ServiceRequest> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const hasLatitude = input.latitude !== undefined;
  const hasLongitude = input.longitude !== undefined;
  if (hasLatitude !== hasLongitude) throw new Error("Latitude and longitude must be provided together");
  if (hasLatitude && (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude) || input.latitude! < -90 || input.latitude! > 90 || input.longitude! < -180 || input.longitude! > 180)) throw new Error("Invalid customer coordinates");
  const existing = await db
    .select()
    .from(serviceRequests)
    .where(and(eq(serviceRequests.customerId, input.customerId), eq(serviceRequests.idempotencyKey, input.idempotencyKey)))
    .limit(1);
  if (existing[0]) {
    try {
      await notifyCompatibleProviders(existing[0]);
    } catch (error) {
      console.warn("[Notifications] Failed to retry compatible provider notifications", error);
    }
    return existing[0];
  }

  const reference = `BH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  await db.insert(serviceRequests).values({
    reference,
    customerId: input.customerId,
    serviceId: input.serviceId,
    description: input.description,
    commune: input.commune,
    quartier: input.quartier,
    landmark: input.landmark,
    address: input.address,
    latitude: input.latitude !== undefined ? input.latitude.toFixed(7) : undefined,
    longitude: input.longitude !== undefined ? input.longitude.toFixed(7) : undefined,
    desiredSlot: input.desiredSlot,
    status: "REQUESTED",
    idempotencyKey: input.idempotencyKey,
  });
  const created = await db.select().from(serviceRequests).where(eq(serviceRequests.reference, reference)).limit(1);
  if (!created[0]) throw new Error("Request creation failed");
  await db.insert(requestStatusHistory).values({
    requestId: created[0].id,
    fromStatus: null,
    toStatus: "REQUESTED",
    actorUserId: input.customerId,
    note: "Demande créée par le client",
  });
  try {
    await notifyCompatibleProviders(created[0]);
  } catch (error) {
    console.warn("[Notifications] Failed to notify compatible providers", error);
  }
  return created[0];
}

export async function listCustomerRequests(customerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: serviceRequests.id,
      reference: serviceRequests.reference,
      description: serviceRequests.description,
      commune: serviceRequests.commune,
      quartier: serviceRequests.quartier,
      desiredSlot: serviceRequests.desiredSlot,
      status: serviceRequests.status,
      createdAt: serviceRequests.createdAt,
      updatedAt: serviceRequests.updatedAt,
      latitude: serviceRequests.latitude,
      longitude: serviceRequests.longitude,
      assignedProviderId: serviceRequests.assignedProviderId,
      service: { id: services.id, name: services.name, pricingMode: services.pricingMode, fixedPriceXof: services.fixedPriceXof },
      review: { id: reviews.id, rating: reviews.rating, comment: reviews.comment, status: reviews.status },
    })
    .from(serviceRequests)
    .leftJoin(services, eq(serviceRequests.serviceId, services.id))
    .leftJoin(reviews, eq(reviews.requestId, serviceRequests.id))
    .where(eq(serviceRequests.customerId, customerId))
    .orderBy(desc(serviceRequests.createdAt));
}

const DEFAULT_COMMISSION_RATE_BPS = 1500;

function getCommissionRateBps() {
  const configured = Number(process.env.BARAHUB_COMMISSION_RATE_BPS ?? DEFAULT_COMMISSION_RATE_BPS);
  return Number.isInteger(configured) && configured >= 0 && configured <= 10000 ? configured : DEFAULT_COMMISSION_RATE_BPS;
}

export async function listRequestQuotes(input: { userId: number; requestId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db
    .select({ quote: quotes, providerName: providerProfiles.displayName, providerUserId: providerProfiles.userId, customerId: serviceRequests.customerId })
    .from(quotes)
    .innerJoin(serviceRequests, eq(quotes.requestId, serviceRequests.id))
    .innerJoin(providerProfiles, eq(quotes.providerId, providerProfiles.id))
    .where(and(eq(quotes.requestId, input.requestId), or(eq(serviceRequests.customerId, input.userId), eq(providerProfiles.userId, input.userId))))
    .orderBy(desc(quotes.createdAt));
  return rows.map(({ quote, providerName, providerUserId, customerId }) => ({
    ...quote,
    providerName,
    canAccept: customerId === input.userId && quote.status === "proposed",
    canEdit: providerUserId === input.userId && quote.status === "proposed",
  }));
}

export async function createProviderQuote(input: {
  userId: number;
  requestId: number;
  amountXof: number;
  travelFeeXof: number;
  note?: string;
  idempotencyKey: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!Number.isInteger(input.amountXof) || input.amountXof <= 0 || !Number.isInteger(input.travelFeeXof) || input.travelFeeXof < 0) throw new Error("Quote amounts must be valid FCFA integers");
  const profile = await getProviderProfileByUserId(input.userId);
  if (!profile || profile.verificationStatus !== "verified") throw new Error("Only a verified provider can send a quote");
  const previousByKey = await db.select().from(quotes).where(and(eq(quotes.providerId, profile.id), eq(quotes.idempotencyKey, input.idempotencyKey))).limit(1);
  if (previousByKey[0]) return previousByKey[0];
  const requestRows = await db.select().from(serviceRequests).where(and(eq(serviceRequests.id, input.requestId), eq(serviceRequests.assignedProviderId, profile.id))).limit(1);
  const request = requestRows[0];
  if (!request || !["ACCEPTED", "QUOTE_PENDING"].includes(request.status)) throw new Error("A quote can only be sent for an accepted mission");

  const totalXof = input.amountXof + input.travelFeeXof;
  const quote = await db.transaction(async (tx) => {
    await tx.update(quotes).set({ status: "expired" }).where(and(eq(quotes.requestId, input.requestId), eq(quotes.providerId, profile.id), eq(quotes.status, "proposed")));
    const inserted = await tx.insert(quotes).values({
      requestId: input.requestId,
      providerId: profile.id,
      amountXof: input.amountXof.toFixed(2),
      travelFeeXof: input.travelFeeXof.toFixed(2),
      totalXof: totalXof.toFixed(2),
      note: input.note,
      status: "proposed",
      idempotencyKey: input.idempotencyKey,
    });
    const quoteId = insertedId(inserted);
    if (request.status === "ACCEPTED") {
      await tx.update(serviceRequests).set({ status: "QUOTE_PENDING" }).where(and(eq(serviceRequests.id, input.requestId), eq(serviceRequests.status, "ACCEPTED")));
      await tx.insert(requestStatusHistory).values({ requestId: input.requestId, fromStatus: "ACCEPTED", toStatus: "QUOTE_PENDING", actorUserId: input.userId, note: "Devis envoyé par le prestataire" });
    }
    const rows = await tx.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
    if (!rows[0]) throw new Error("Quote creation failed");
    return rows[0];
  });
  try {
    await createNotification({ userId: request.customerId, type: "mission_update", title: "Nouveau devis à consulter", body: `Un devis de ${totalXof.toLocaleString("fr-FR")} FCFA est disponible pour ${request.reference}.`, reference: request.reference, dedupeKey: `quote:${quote.id}:customer` });
  } catch (error) {
    console.warn("[Notifications] Failed to notify customer about quote", error);
  }
  return quote;
}

export async function acceptQuote(input: { userId: number; quoteId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db
    .select({ quote: quotes, request: serviceRequests, providerUserId: providerProfiles.userId })
    .from(quotes)
    .innerJoin(serviceRequests, eq(quotes.requestId, serviceRequests.id))
    .innerJoin(providerProfiles, eq(quotes.providerId, providerProfiles.id))
    .where(and(eq(quotes.id, input.quoteId), eq(serviceRequests.customerId, input.userId)))
    .limit(1);
  const row = rows[0];
  if (!row || row.quote.status !== "proposed" || row.request.status !== "QUOTE_PENDING") throw new Error("This quote is no longer available");
  const accepted = await db.transaction(async (tx) => {
    const updatedQuote = await tx.update(quotes).set({ status: "accepted", acceptedAt: new Date() }).where(and(eq(quotes.id, input.quoteId), eq(quotes.status, "proposed")));
    const quoteAffectedRows = (updatedQuote as any).affectedRows ?? (updatedQuote as any)[0]?.affectedRows ?? 0;
    if (quoteAffectedRows !== 1) throw new Error("Quote changed before acceptance");
    const updatedRequest = await tx.update(serviceRequests).set({ status: "QUOTE_ACCEPTED" }).where(and(eq(serviceRequests.id, row.request.id), eq(serviceRequests.customerId, input.userId), eq(serviceRequests.status, "QUOTE_PENDING")));
    const requestAffectedRows = (updatedRequest as any).affectedRows ?? (updatedRequest as any)[0]?.affectedRows ?? 0;
    if (requestAffectedRows !== 1) throw new Error("Request changed before quote acceptance");
    await tx.update(quotes).set({ status: "expired" }).where(and(eq(quotes.requestId, row.request.id), eq(quotes.id, input.quoteId), eq(quotes.status, "proposed")));
    await tx.insert(requestStatusHistory).values({ requestId: row.request.id, fromStatus: "QUOTE_PENDING", toStatus: "QUOTE_ACCEPTED", actorUserId: input.userId, note: "Devis accepté par le client" });
    const updatedRows = await tx.select().from(quotes).where(eq(quotes.id, input.quoteId)).limit(1);
    if (!updatedRows[0]) throw new Error("Accepted quote could not be loaded");
    return updatedRows[0];
  });
  try {
    await createNotification({ userId: row.providerUserId, type: "mission_update", title: "Devis accepté", body: `Le client a accepté votre devis pour ${row.request.reference}.`, reference: row.request.reference, dedupeKey: `quote:${accepted.id}:provider:accepted` });
  } catch (error) {
    console.warn("[Notifications] Failed to notify provider about quote acceptance", error);
  }
  return accepted;
}

export async function rejectQuote(input: { userId: number; quoteId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db
    .select({ quote: quotes, request: serviceRequests, providerUserId: providerProfiles.userId })
    .from(quotes)
    .innerJoin(serviceRequests, eq(quotes.requestId, serviceRequests.id))
    .innerJoin(providerProfiles, eq(quotes.providerId, providerProfiles.id))
    .where(and(eq(quotes.id, input.quoteId), eq(serviceRequests.customerId, input.userId)))
    .limit(1);
  const row = rows[0];
  if (!row || row.quote.status !== "proposed" || row.request.status !== "QUOTE_PENDING") throw new Error("This quote is no longer available");
  const rejected = await db.transaction(async (tx) => {
    const updatedQuote = await tx.update(quotes).set({ status: "rejected" }).where(and(eq(quotes.id, input.quoteId), eq(quotes.status, "proposed")));
    const quoteAffectedRows = (updatedQuote as any).affectedRows ?? (updatedQuote as any)[0]?.affectedRows ?? 0;
    if (quoteAffectedRows !== 1) throw new Error("Quote changed before rejection");
    const updatedRequest = await tx.update(serviceRequests).set({ status: "ACCEPTED" }).where(and(eq(serviceRequests.id, row.request.id), eq(serviceRequests.customerId, input.userId), eq(serviceRequests.status, "QUOTE_PENDING")));
    const requestAffectedRows = (updatedRequest as any).affectedRows ?? (updatedRequest as any)[0]?.affectedRows ?? 0;
    if (requestAffectedRows !== 1) throw new Error("Request changed before quote rejection");
    await tx.insert(requestStatusHistory).values({ requestId: row.request.id, fromStatus: "QUOTE_PENDING", toStatus: "ACCEPTED", actorUserId: input.userId, note: "Devis refusé par le client" });
    const updatedRows = await tx.select().from(quotes).where(eq(quotes.id, input.quoteId)).limit(1);
    if (!updatedRows[0]) throw new Error("Rejected quote could not be loaded");
    return updatedRows[0];
  });
  try {
    await createNotification({ userId: row.providerUserId, type: "mission_update", title: "Devis refusé", body: `Le client a refusé votre devis pour ${row.request.reference}.`, reference: row.request.reference, dedupeKey: `quote:${rejected.id}:provider:rejected` });
  } catch (error) {
    console.warn("[Notifications] Failed to notify provider about quote rejection", error);
  }
  return rejected;
}

export async function declarePayment(input: { userId: number; requestId: number; method: "cash" | "mobile_money" | "external"; idempotencyKey: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const previousByKey = await db.select().from(payments).where(and(eq(payments.payerUserId, input.userId), eq(payments.idempotencyKey, input.idempotencyKey))).limit(1);
  if (previousByKey[0]) return previousByKey[0];
  const rows = await db
    .select({ request: serviceRequests, fixedPriceXof: services.fixedPriceXof })
    .from(serviceRequests)
    .leftJoin(services, eq(serviceRequests.serviceId, services.id))
    .where(and(eq(serviceRequests.id, input.requestId), eq(serviceRequests.customerId, input.userId)))
    .limit(1);
  const row = rows[0];
  if (!row || !["QUOTE_ACCEPTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "REVIEWED"].includes(row.request.status)) throw new Error("Payment can only be declared for an accepted intervention");
  const acceptedQuoteRows = await db.select().from(quotes).where(and(eq(quotes.requestId, input.requestId), eq(quotes.status, "accepted"))).orderBy(desc(quotes.acceptedAt)).limit(1);
  const amountXof = acceptedQuoteRows[0]?.totalXof ? Number(acceptedQuoteRows[0].totalXof) : Number(row.fixedPriceXof ?? 0);
  if (!Number.isFinite(amountXof) || amountXof <= 0) throw new Error("No payable amount is available for this request");
  const commissionRateBps = getCommissionRateBps();
  const commissionXof = Math.round(amountXof * commissionRateBps) / 10000;
  const paymentNetXof = amountXof - commissionXof;
  await db.insert(payments).values({ requestId: input.requestId, payerUserId: input.userId, amountXof: amountXof.toFixed(2), method: input.method, status: "declared", commissionRateBps, commissionXof: commissionXof.toFixed(2), providerNetXof: paymentNetXof.toFixed(2), idempotencyKey: input.idempotencyKey });
  const created = await db.select().from(payments).where(and(eq(payments.payerUserId, input.userId), eq(payments.idempotencyKey, input.idempotencyKey))).limit(1);
  if (!created[0]) throw new Error("Payment declaration failed");
  return created[0];
}

export async function getCustomerPayment(input: { userId: number; requestId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db
    .select({ payment: payments, requestReference: serviceRequests.reference })
    .from(payments)
    .innerJoin(serviceRequests, eq(payments.requestId, serviceRequests.id))
    .where(and(eq(payments.requestId, input.requestId), eq(payments.payerUserId, input.userId), eq(serviceRequests.customerId, input.userId)))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function createCustomerReview(input: { userId: number; requestId: number; rating: number; comment?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) throw new Error("Rating must be between 1 and 5");
  if (input.comment && input.comment.length > 1200) throw new Error("Review comment is too long");
  const existing = await db.select().from(reviews).where(and(eq(reviews.requestId, input.requestId), eq(reviews.customerId, input.userId))).limit(1);
  if (existing[0]) return existing[0];

  const createdReview = await db.transaction(async (tx) => {
    const rows = await tx
      .select({ request: serviceRequests, providerId: providerProfiles.id, providerUserId: providerProfiles.userId })
      .from(serviceRequests)
      .leftJoin(providerProfiles, eq(serviceRequests.assignedProviderId, providerProfiles.id))
      .where(and(eq(serviceRequests.id, input.requestId), eq(serviceRequests.customerId, input.userId), eq(serviceRequests.status, "COMPLETED")))
      .limit(1);
    const row = rows[0];
    if (!row || !row.providerId || !row.providerUserId) throw new Error("Only a completed intervention can be reviewed");
    await tx.insert(reviews).values({ requestId: input.requestId, customerId: input.userId, providerId: row.providerId, rating: input.rating, comment: input.comment });
    const updated = await tx.update(serviceRequests).set({ status: "REVIEWED" }).where(and(eq(serviceRequests.id, input.requestId), eq(serviceRequests.customerId, input.userId), eq(serviceRequests.status, "COMPLETED")));
    const affectedRows = (updated as any).affectedRows ?? (updated as any)[0]?.affectedRows ?? 0;
    if (affectedRows !== 1) throw new Error("Request changed before review publication");
    await tx.insert(requestStatusHistory).values({ requestId: input.requestId, fromStatus: "COMPLETED", toStatus: "REVIEWED", actorUserId: input.userId, note: "Avis client publié après intervention" });
    const created = await tx.select().from(reviews).where(eq(reviews.requestId, input.requestId)).limit(1);
    if (!created[0]) throw new Error("Review creation failed");
    return { review: created[0], providerUserId: row.providerUserId, reference: row.request.reference };
  });
  try {
    await Promise.all([
      createNotification({ userId: createdReview.providerUserId, type: "new_review", title: "Nouvel avis client", body: `Vous avez reçu une note de ${createdReview.review.rating}/5 après l’intervention ${createdReview.reference}.`, reference: createdReview.reference, dedupeKey: `review:${createdReview.review.id}:provider` }),
      createNotification({ userId: input.userId, type: "review_published", title: "Avis publié", body: `Votre avis pour ${createdReview.reference} a bien été enregistré.`, reference: createdReview.reference, dedupeKey: `review:${createdReview.review.id}:customer` }),
    ]);
  } catch (error) {
    console.warn("[Notifications] Failed to notify review participants", error);
  }
  return createdReview.review;
}

export async function getProviderReviewSummary(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const profile = await getProviderProfileByUserId(userId);
  if (!profile) return { averageRating: null, reviewCount: 0, reviews: [] };
  const published = await db.select().from(reviews).where(and(eq(reviews.providerId, profile.id), eq(reviews.status, "published"))).orderBy(desc(reviews.createdAt));
  const total = published.reduce((sum, review) => sum + review.rating, 0);
  return {
    averageRating: published.length > 0 ? Number((total / published.length).toFixed(1)) : null,
    reviewCount: published.length,
    reviews: published.slice(0, 10).map((review) => ({ id: review.id, rating: review.rating, comment: review.comment, createdAt: review.createdAt })),
  };
}

async function getProviderProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select().from(providerProfiles).where(eq(providerProfiles.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function getProviderWorkspace(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const profile = await getProviderProfileByUserId(userId);
  if (!profile) return { profile: null, services: [], zones: [], availableMissions: [], assignedMissions: [] };

  const selectedServices = await db
    .select({ id: services.id, name: services.name, slug: services.slug })
    .from(providerServices)
    .innerJoin(services, eq(providerServices.serviceId, services.id))
    .where(and(eq(providerServices.providerId, profile.id), eq(services.active, true)));
  const selectedZones = await db
    .select({ id: zones.id, commune: zones.commune, quartier: zones.quartier })
    .from(providerZones)
    .innerJoin(zones, eq(providerZones.zoneId, zones.id))
    .where(and(eq(providerZones.providerId, profile.id), eq(zones.active, true)));

  const serviceIds = selectedServices.map((service) => service.id);
  const zoneFilters = selectedZones.map((zone) => and(eq(serviceRequests.commune, zone.commune), eq(serviceRequests.quartier, zone.quartier)));
  const refusedRows = await db.select({ requestId: missionResponses.requestId }).from(missionResponses).where(and(eq(missionResponses.providerId, profile.id), eq(missionResponses.decision, "refused")));
  const refusedRequestIds = refusedRows.map((row) => row.requestId);
  const availableMissions = profile.verificationStatus === "verified" && serviceIds.length > 0 && zoneFilters.length > 0
    ? await db
        .select({
          id: serviceRequests.id,
          reference: serviceRequests.reference,
          description: serviceRequests.description,
          commune: serviceRequests.commune,
          quartier: serviceRequests.quartier,
          desiredSlot: serviceRequests.desiredSlot,
          status: serviceRequests.status,
          createdAt: serviceRequests.createdAt,
          service: { id: services.id, name: services.name },
        })
        .from(serviceRequests)
        .leftJoin(services, eq(serviceRequests.serviceId, services.id))
        .where(and(eq(serviceRequests.status, "REQUESTED"), isNull(serviceRequests.assignedProviderId), inArray(serviceRequests.serviceId, serviceIds), or(...zoneFilters), ...(refusedRequestIds.length > 0 ? [notInArray(serviceRequests.id, refusedRequestIds)] : [])))
        .orderBy(desc(serviceRequests.createdAt))
    : [];

  const assignedMissions = profile.verificationStatus === "verified"
    ? await db
    .select({
      id: serviceRequests.id,
      reference: serviceRequests.reference,
      description: serviceRequests.description,
      commune: serviceRequests.commune,
      quartier: serviceRequests.quartier,
      landmark: serviceRequests.landmark,
      address: serviceRequests.address,
      desiredSlot: serviceRequests.desiredSlot,
      status: serviceRequests.status,
      createdAt: serviceRequests.createdAt,
      updatedAt: serviceRequests.updatedAt,
      service: { id: services.id, name: services.name },
    })
    .from(serviceRequests)
    .leftJoin(services, eq(serviceRequests.serviceId, services.id))
    .where(eq(serviceRequests.assignedProviderId, profile.id))
    .orderBy(desc(serviceRequests.updatedAt))
    : [];

  return { profile, services: selectedServices, zones: selectedZones, availableMissions, assignedMissions };
}

export async function saveProviderProfile(input: {
  userId: number;
  displayName: string;
  bio?: string;
  skills?: string;
  availabilityNotes?: string;
  serviceIds: number[];
  zoneIds: number[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const serviceIds = [...new Set(input.serviceIds)];
  const zoneIds = [...new Set(input.zoneIds)];
  const validServices = await db.select({ id: services.id }).from(services).where(and(eq(services.active, true), inArray(services.id, serviceIds)));
  const validZones = await db.select({ id: zones.id }).from(zones).where(and(eq(zones.active, true), inArray(zones.id, zoneIds)));
  if (validServices.length !== serviceIds.length || validZones.length !== zoneIds.length) throw new Error("Service or zone is not available");

  await db.transaction(async (tx) => {
    const existingRows = await tx.select().from(providerProfiles).where(eq(providerProfiles.userId, input.userId)).limit(1);
    const existing = existingRows[0];
    let providerId: number;
    if (existing) {
      providerId = existing.id;
      await tx.update(providerProfiles).set({ displayName: input.displayName, bio: input.bio, skills: input.skills, availabilityNotes: input.availabilityNotes }).where(eq(providerProfiles.id, providerId));
    } else {
      const inserted = await tx.insert(providerProfiles).values({ userId: input.userId, displayName: input.displayName, bio: input.bio, skills: input.skills, availabilityNotes: input.availabilityNotes, verificationStatus: "pending" });
      providerId = insertedId(inserted);
    }

    await tx.delete(providerServices).where(eq(providerServices.providerId, providerId));
    await tx.delete(providerZones).where(eq(providerZones.providerId, providerId));
    await tx.insert(providerServices).values(serviceIds.map((serviceId) => ({ providerId, serviceId })));
    await tx.insert(providerZones).values(zoneIds.map((zoneId) => ({ providerId, zoneId })));
  });
  return getProviderWorkspace(input.userId);
}

async function ensureProviderCompatibility(providerId: number, requestId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db
    .select({ request: serviceRequests, serviceId: services.id })
    .from(serviceRequests)
    .leftJoin(services, eq(serviceRequests.serviceId, services.id))
    .where(eq(serviceRequests.id, requestId))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error("Mission not found");
  const serviceMatch = row.serviceId
    ? await db
        .select({ serviceId: providerServices.serviceId })
        .from(providerServices)
        .innerJoin(services, eq(providerServices.serviceId, services.id))
        .where(and(eq(providerServices.providerId, providerId), eq(providerServices.serviceId, row.serviceId), eq(services.active, true)))
        .limit(1)
    : [];
  const zoneMatch = await db
    .select({ zoneId: providerZones.zoneId })
    .from(providerZones)
    .innerJoin(zones, eq(providerZones.zoneId, zones.id))
    .where(and(eq(providerZones.providerId, providerId), eq(zones.commune, row.request.commune), eq(zones.quartier, row.request.quartier)))
    .limit(1);
  if (!serviceMatch[0] || !zoneMatch[0]) throw new Error("Mission is outside your configured coverage");
  return row.request;
}

export async function respondToMission(input: {
  userId: number;
  requestId: number;
  decision: "accepted" | "refused";
  reason?: string;
  idempotencyKey: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const profile = await getProviderProfileByUserId(input.userId);
  if (!profile || profile.verificationStatus !== "verified") throw new Error("Only a verified provider can respond to missions");
  const previousByKey = await db.select().from(missionResponses).where(and(eq(missionResponses.providerId, profile.id), eq(missionResponses.idempotencyKey, input.idempotencyKey))).limit(1);
  if (previousByKey[0]) {
    if (previousByKey[0].requestId !== input.requestId) throw new Error("Idempotency key already used for another mission");
    return previousByKey[0];
  }
  const previousByMission = await db.select().from(missionResponses).where(and(eq(missionResponses.providerId, profile.id), eq(missionResponses.requestId, input.requestId))).limit(1);
  if (previousByMission[0]) return previousByMission[0];
  const request = await ensureProviderCompatibility(profile.id, input.requestId);
  if (request.status !== "REQUESTED" || request.assignedProviderId !== null) throw new Error("Mission is no longer available");

  if (input.decision === "refused") {
    await db.insert(missionResponses).values({ requestId: input.requestId, providerId: profile.id, decision: input.decision, reason: input.reason, idempotencyKey: input.idempotencyKey });
    const response = await db.select().from(missionResponses).where(and(eq(missionResponses.providerId, profile.id), eq(missionResponses.requestId, input.requestId))).limit(1);
    if (!response[0]) throw new Error("Mission response was not saved");
    return response[0];
  }

  const response = await db.transaction(async (tx) => {
    const updated = await tx
      .update(serviceRequests)
      .set({ assignedProviderId: profile.id, status: "ASSIGNED" })
      .where(and(eq(serviceRequests.id, input.requestId), eq(serviceRequests.status, "REQUESTED"), isNull(serviceRequests.assignedProviderId)));
    const affectedRows = (updated as any).affectedRows ?? (updated as any)[0]?.affectedRows ?? 0;
    if (affectedRows !== 1) throw new Error("Mission was taken by another provider");
    await tx.insert(missionResponses).values({ requestId: input.requestId, providerId: profile.id, decision: input.decision, reason: input.reason, idempotencyKey: input.idempotencyKey });
    await tx.insert(requestStatusHistory).values({ requestId: input.requestId, fromStatus: "REQUESTED", toStatus: "ASSIGNED", actorUserId: input.userId, note: "Mission acceptée par le prestataire" });
    const response = await tx.select().from(missionResponses).where(and(eq(missionResponses.providerId, profile.id), eq(missionResponses.requestId, input.requestId))).limit(1);
    if (!response[0]) throw new Error("Mission response was not saved");
    return response[0];
  });
  try {
    await createNotification({ userId: request.customerId, type: "mission_update", title: "Prestataire trouvé", body: `Un prestataire a accepté votre demande ${request.reference}.`, reference: request.reference, dedupeKey: `mission:${request.id}:assigned` });
  } catch (error) {
    console.warn("[Notifications] Failed to notify customer about assignment", error);
  }
  return response;
}

const allowedMissionTransitions: Record<string, string[]> = {
  ASSIGNED: ["ACCEPTED"],
  ACCEPTED: ["SCHEDULED"],
  QUOTE_ACCEPTED: ["SCHEDULED"],
  SCHEDULED: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED"],
};

export const DEFAULT_APPOINTMENT_DURATION_MINUTES = 60;

export function getAppointmentWindow(startsAt: Date, durationMinutes?: number | null, now = new Date()) {
  const startMs = startsAt.getTime();
  if (!Number.isFinite(startMs)) throw new Error("Invalid appointment start");
  if (startMs <= now.getTime()) throw new Error("Appointment must be in the future");
  const duration = Number.isInteger(durationMinutes) && durationMinutes! > 0 ? durationMinutes! : DEFAULT_APPOINTMENT_DURATION_MINUTES;
  if (duration > 720) throw new Error("Appointment duration is too long");
  return { startsAt, endsAt: new Date(startMs + duration * 60_000), durationMinutes: duration };
}

export function appointmentWindowsOverlap(first: { startsAt: Date; endsAt: Date }, second: { startsAt: Date; endsAt: Date }) {
  return first.startsAt.getTime() < second.endsAt.getTime() && first.endsAt.getTime() > second.startsAt.getTime();
}

async function confirmAppointment(tx: any, input: { requestId: number; providerId: number; startsAt: Date; durationMinutes?: number | null }) {
  const window = getAppointmentWindow(input.startsAt, input.durationMinutes);

  // Every scheduling transaction locks the same provider row first. This serializes
  // concurrent scheduling attempts for one provider and closes the overlap race.
  await tx.execute(sql`SELECT id FROM providerProfiles WHERE id = ${input.providerId} FOR UPDATE`);
  const overlaps = await tx
    .select({ id: appointments.id, requestId: appointments.requestId })
    .from(appointments)
    .where(and(
      eq(appointments.providerId, input.providerId),
      eq(appointments.status, "confirmed"),
      lt(appointments.startsAt, window.endsAt),
      gt(appointments.endsAt, window.startsAt),
    ))
    .limit(1);
  if (overlaps[0]) throw new Error("Ce créneau n’est plus disponible pour ce prestataire");

  await tx.insert(appointments).values({
    requestId: input.requestId,
    providerId: input.providerId,
    startsAt: window.startsAt,
    endsAt: window.endsAt,
    status: "confirmed",
  });
  return window;
}

export async function updateProviderMissionStatus(input: { userId: number; requestId: number; status: "ACCEPTED" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const profile = await getProviderProfileByUserId(input.userId);
  if (!profile || profile.verificationStatus !== "verified") throw new Error("Only a verified provider can update missions");
  const rows = await db
    .select({ request: serviceRequests, durationMinutes: services.durationMinutes, pricingMode: services.pricingMode })
    .from(serviceRequests)
    .leftJoin(services, eq(serviceRequests.serviceId, services.id))
    .where(and(eq(serviceRequests.id, input.requestId), eq(serviceRequests.assignedProviderId, profile.id)))
    .limit(1);
  const row = rows[0];
  const request = row?.request;
  if (!request) throw new Error("Mission not found");
  if (!allowedMissionTransitions[request.status]?.includes(input.status)) throw new Error(`Invalid mission transition: ${request.status} -> ${input.status}`);
  if (input.status === "SCHEDULED" && !request.desiredSlot) throw new Error("Un créneau souhaité est nécessaire avant de confirmer le rendez-vous");
  if (input.status === "SCHEDULED" && row.pricingMode === "quote") {
    const acceptedQuote = await db.select({ id: quotes.id }).from(quotes).where(and(eq(quotes.requestId, input.requestId), eq(quotes.providerId, profile.id), eq(quotes.status, "accepted"))).limit(1);
    if (!acceptedQuote[0]) throw new Error("Un devis accepté est nécessaire avant de confirmer le rendez-vous");
  }

  const updatedRequest = await db.transaction(async (tx) => {
    if (input.status === "SCHEDULED") {
      await confirmAppointment(tx, { requestId: input.requestId, providerId: profile.id, startsAt: request.desiredSlot!, durationMinutes: row.durationMinutes });
    }
    const updated = await tx.update(serviceRequests).set({ status: input.status }).where(and(eq(serviceRequests.id, input.requestId), eq(serviceRequests.assignedProviderId, profile.id), eq(serviceRequests.status, request.status)));
    const affectedRows = (updated as any).affectedRows ?? (updated as any)[0]?.affectedRows ?? 0;
    if (affectedRows !== 1) throw new Error("Mission changed before this update");
    await tx.insert(requestStatusHistory).values({ requestId: input.requestId, fromStatus: request.status, toStatus: input.status, actorUserId: input.userId, note: "Statut mis à jour par le prestataire" });
    if (input.status === "COMPLETED") await tx.delete(providerLocations).where(eq(providerLocations.requestId, input.requestId));
    return { ...request, status: input.status };
  });
  try {
    await createNotification({ userId: request.customerId, type: "mission_update", title: "Statut de mission mis à jour", body: `Votre demande ${request.reference} est maintenant ${input.status}.`, reference: request.reference, dedupeKey: `mission:${request.id}:status:${input.status}` });
  } catch (error) {
    console.warn("[Notifications] Failed to notify customer about mission status", error);
  }
  return updatedRequest;
}

const customerCancellableStatuses = ["REQUESTED", "ASSIGNED", "ACCEPTED", "QUOTE_PENDING", "QUOTE_ACCEPTED", "SCHEDULED"] as const;
const providerCancellableStatuses = ["ASSIGNED", "ACCEPTED", "QUOTE_PENDING", "QUOTE_ACCEPTED", "SCHEDULED"] as const;
const adminCancellableStatuses = [...customerCancellableStatuses, "IN_PROGRESS"] as const;

export async function cancelServiceRequest(input: { userId: number; requestId: number; actor: "customer" | "provider" | "admin"; reason?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const reason = input.reason?.trim();
  if (reason && reason.length > 500) throw new Error("Cancellation reason is too long");

  const requestRows = await db.select().from(serviceRequests).where(eq(serviceRequests.id, input.requestId)).limit(1);
  const request = requestRows[0];
  if (!request) throw new Error("Request not found");

  let providerUserId: number | null = null;
  if (request.assignedProviderId) {
    const providerRows = await db.select({ userId: providerProfiles.userId }).from(providerProfiles).where(eq(providerProfiles.id, request.assignedProviderId)).limit(1);
    providerUserId = providerRows[0]?.userId ?? null;
  }
  if (input.actor === "customer" && request.customerId !== input.userId) throw new Error("Only the request owner can cancel this request");
  if (input.actor === "provider" && providerUserId !== input.userId) throw new Error("Only the assigned provider can cancel this request");

  const allowedStatuses = input.actor === "customer" ? customerCancellableStatuses : input.actor === "provider" ? providerCancellableStatuses : adminCancellableStatuses;
  if (request.status === "CANCELLED") return request;
  if (!allowedStatuses.includes(request.status as never)) throw new Error("This request can no longer be cancelled");
  if (input.actor === "provider" && !request.assignedProviderId) throw new Error("Only an assigned provider can cancel this request");

  const cancelled = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM serviceRequests WHERE id = ${input.requestId} FOR UPDATE`);
    const updated = await tx.update(serviceRequests).set({ status: "CANCELLED" }).where(and(eq(serviceRequests.id, input.requestId), eq(serviceRequests.status, request.status)));
    const affectedRows = (updated as any).affectedRows ?? (updated as any)[0]?.affectedRows ?? 0;
    if (affectedRows !== 1) throw new Error("Request changed before cancellation");
    await tx.delete(appointments).where(eq(appointments.requestId, input.requestId));
    await tx.delete(providerLocations).where(eq(providerLocations.requestId, input.requestId));
    await tx.insert(requestStatusHistory).values({ requestId: input.requestId, fromStatus: request.status, toStatus: "CANCELLED", actorUserId: input.userId, note: reason || `Demande annulée par ${input.actor}` });
    if (input.actor === "admin") {
      await tx.insert(adminAuditLogs).values({ adminUserId: input.userId, action: "request.cancel", entityType: "serviceRequest", entityId: input.requestId, note: reason });
    }
    const rows = await tx.select().from(serviceRequests).where(eq(serviceRequests.id, input.requestId)).limit(1);
    if (!rows[0]) throw new Error("Cancelled request could not be loaded");
    return rows[0];
  });

  const recipients = new Set<number>([request.customerId]);
  if (providerUserId) recipients.add(providerUserId);
  recipients.delete(input.userId);
  try {
    await Promise.all([...recipients].map((userId) => createNotification({
      userId,
      type: "mission_update",
      title: "Demande annulée",
      body: `La demande ${request.reference} a été annulée${reason ? ` : ${reason}` : "."}`,
      reference: request.reference,
      dedupeKey: `request:${request.id}:cancelled:${input.actor}`,
    })));
  } catch (error) {
    console.warn("[Notifications] Failed to notify about cancellation", error);
  }
  return cancelled;
}


export async function createReviewReport(input: { userId: number; reviewId: number; reason: string; details?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const reviewRows = await db.select().from(reviews).where(eq(reviews.id, input.reviewId)).limit(1);
  const review = reviewRows[0];
  if (!review || review.customerId === input.userId) throw new Error("This review cannot be reported by this user");
  const existing = await db.select().from(reviewReports).where(and(eq(reviewReports.reviewId, input.reviewId), eq(reviewReports.reporterId, input.userId))).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(reviewReports).values({ reviewId: input.reviewId, reporterId: input.userId, reason: input.reason, details: input.details });
  const created = await db.select().from(reviewReports).where(and(eq(reviewReports.reviewId, input.reviewId), eq(reviewReports.reporterId, input.userId))).limit(1);
  if (!created[0]) throw new Error("Report creation failed");
  return created[0];
}

export async function listAdminReviews() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      status: reviews.status,
      createdAt: reviews.createdAt,
      requestReference: serviceRequests.reference,
      customerName: users.name,
      providerName: providerProfiles.displayName,
    })
    .from(reviews)
    .innerJoin(serviceRequests, eq(reviews.requestId, serviceRequests.id))
    .innerJoin(users, eq(reviews.customerId, users.id))
    .innerJoin(providerProfiles, eq(reviews.providerId, providerProfiles.id))
    .orderBy(desc(reviews.createdAt));
}

export async function listAdminReviewReports() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db
    .select({
      id: reviewReports.id,
      reviewId: reviewReports.reviewId,
      reason: reviewReports.reason,
      details: reviewReports.details,
      status: reviewReports.status,
      resolutionNote: reviewReports.resolutionNote,
      createdAt: reviewReports.createdAt,
      reporterName: users.name,
      reviewRating: reviews.rating,
      reviewComment: reviews.comment,
      reviewStatus: reviews.status,
      requestReference: serviceRequests.reference,
    })
    .from(reviewReports)
    .innerJoin(users, eq(reviewReports.reporterId, users.id))
    .innerJoin(reviews, eq(reviewReports.reviewId, reviews.id))
    .innerJoin(serviceRequests, eq(reviews.requestId, serviceRequests.id))
    .orderBy(desc(reviewReports.createdAt));
}

export async function listAdminPayments() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db
    .select({
      payment: payments,
      requestReference: serviceRequests.reference,
      customerName: users.name,
      providerName: providerProfiles.displayName,
    })
    .from(payments)
    .innerJoin(serviceRequests, eq(payments.requestId, serviceRequests.id))
    .innerJoin(users, eq(payments.payerUserId, users.id))
    .leftJoin(providerProfiles, eq(serviceRequests.assignedProviderId, providerProfiles.id))
    .orderBy(desc(payments.createdAt));
}

export async function listAdminRequests() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db
    .select({
      request: serviceRequests,
      customerName: users.name,
      providerName: providerProfiles.displayName,
      appointment: appointments,
    })
    .from(serviceRequests)
    .innerJoin(users, eq(serviceRequests.customerId, users.id))
    .leftJoin(providerProfiles, eq(serviceRequests.assignedProviderId, providerProfiles.id))
    .leftJoin(appointments, eq(appointments.requestId, serviceRequests.id))
    .orderBy(desc(serviceRequests.createdAt));
}

export async function transitionPaymentStatus(input: { adminUserId: number; paymentId: number; status: "confirmed" | "failed"; note?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existingRows = await db.select().from(payments).where(eq(payments.id, input.paymentId)).limit(1);
  const existing = existingRows[0];
  if (!existing) throw new Error("Payment not found");
  const allowed = existing.status === "declared" ? ["confirmed", "failed"] : [];
  if (!allowed.includes(input.status)) return existing;
  const updated = await db.transaction(async (tx) => {
    await tx.update(payments).set({ status: input.status, confirmedBy: input.status === "confirmed" ? input.adminUserId : existing.confirmedBy, confirmedAt: input.status === "confirmed" ? new Date() : existing.confirmedAt }).where(and(eq(payments.id, input.paymentId), eq(payments.status, existing.status)));
    await tx.insert(adminAuditLogs).values({ adminUserId: input.adminUserId, action: `payment.${input.status}`, entityType: "payment", entityId: input.paymentId, note: input.note });
    const rows = await tx.select().from(payments).where(eq(payments.id, input.paymentId)).limit(1);
    if (!rows[0]) throw new Error("Payment status update failed");
    return rows[0];
  });
  try {
    const requestRows = await db.select({ reference: serviceRequests.reference }).from(serviceRequests).where(eq(serviceRequests.id, updated.requestId)).limit(1);
    const reference = requestRows[0]?.reference;
    if (reference) await createNotification({ userId: updated.payerUserId, type: "system", title: "Statut du paiement mis à jour", body: `La déclaration de paiement ${reference} est maintenant ${input.status}.`, reference, dedupeKey: `payment:${updated.id}:${input.status}` });
  } catch (error) {
    console.warn("[Notifications] Failed to notify customer about payment", error);
  }
  return updated;
}

export async function moderateReview(input: { adminUserId: number; reviewId: number; status: "published" | "flagged" | "hidden"; note?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async (tx) => {
    const existing = await tx.select().from(reviews).where(eq(reviews.id, input.reviewId)).limit(1);
    if (!existing[0]) throw new Error("Review not found");
    await tx.update(reviews).set({ status: input.status }).where(eq(reviews.id, input.reviewId));
    await tx.insert(adminAuditLogs).values({ adminUserId: input.adminUserId, action: `review.${input.status}`, entityType: "review", entityId: input.reviewId, note: input.note });
    const updated = await tx.select().from(reviews).where(eq(reviews.id, input.reviewId)).limit(1);
    if (!updated[0]) throw new Error("Review moderation failed");
    return updated[0];
  });
}

export async function resolveReviewReport(input: { adminUserId: number; reportId: number; status: "resolved" | "dismissed"; resolutionNote?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async (tx) => {
    const existing = await tx.select().from(reviewReports).where(eq(reviewReports.id, input.reportId)).limit(1);
    if (!existing[0]) throw new Error("Report not found");
    if (existing[0].status !== "open") return existing[0];
    await tx.update(reviewReports).set({ status: input.status, resolutionNote: input.resolutionNote, resolvedBy: input.adminUserId, resolvedAt: new Date() }).where(and(eq(reviewReports.id, input.reportId), eq(reviewReports.status, "open")));
    await tx.insert(adminAuditLogs).values({ adminUserId: input.adminUserId, action: `review_report.${input.status}`, entityType: "review_report", entityId: input.reportId, note: input.resolutionNote });
    const updated = await tx.select().from(reviewReports).where(eq(reviewReports.id, input.reportId)).limit(1);
    if (!updated[0]) throw new Error("Report resolution failed");
    return updated[0];
  });
}


export async function getCustomerTracking(userId: number, requestId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select({ request: serviceRequests }).from(serviceRequests).where(and(eq(serviceRequests.id, requestId), eq(serviceRequests.customerId, userId))).limit(1);
  const request = rows[0]?.request;
  if (!request) throw new Error("Request not found");
  const trackable = request.status === "SCHEDULED" || request.status === "IN_PROGRESS";
  const locationRows = trackable && request.assignedProviderId
    ? await db.select().from(providerLocations).where(and(eq(providerLocations.requestId, request.id), eq(providerLocations.providerId, request.assignedProviderId), eq(providerLocations.sharingStatus, "shared"))).limit(1)
    : [];
  return {
    requestId: request.id,
    reference: request.reference,
    status: request.status,
    customerLocation: request.latitude && request.longitude ? { latitude: Number(request.latitude), longitude: Number(request.longitude) } : null,
    providerLocation: locationRows[0] ? { latitude: Number(locationRows[0].latitude), longitude: Number(locationRows[0].longitude), accuracy: locationRows[0].accuracy ? Number(locationRows[0].accuracy) : null, updatedAt: locationRows[0].updatedAt } : null,
    trackingAvailable: trackable && Boolean(request.assignedProviderId),
  };
}

export async function updateProviderLocation(input: { userId: number; requestId: number; latitude: number; longitude: number; accuracy?: number; sharingStatus: "shared" | "paused" }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90 || !Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) throw new Error("Invalid coordinates");
  if (input.accuracy !== undefined && (!Number.isFinite(input.accuracy) || input.accuracy < 0 || input.accuracy > 10000)) throw new Error("Invalid accuracy");
  const profile = await getProviderProfileByUserId(input.userId);
  if (!profile || profile.verificationStatus !== "verified") throw new Error("Only a verified provider can share location");
  const requestRows = await db.select().from(serviceRequests).where(and(eq(serviceRequests.id, input.requestId), eq(serviceRequests.assignedProviderId, profile.id), inArray(serviceRequests.status, ["SCHEDULED", "IN_PROGRESS"]))).limit(1);
  const request = requestRows[0];
  if (!request) throw new Error("Location sharing is only available for an active scheduled mission");
  const existing = await db.select().from(providerLocations).where(and(eq(providerLocations.requestId, input.requestId), eq(providerLocations.providerId, profile.id))).limit(1);
  if (input.sharingStatus === "paused") {
    if (existing[0]) await db.delete(providerLocations).where(and(eq(providerLocations.id, existing[0].id), eq(providerLocations.providerId, profile.id), eq(providerLocations.requestId, input.requestId)));
    return { success: true as const, updatedAt: new Date(), sharingStatus: "paused" as const };
  }
  const values = { latitude: input.latitude.toFixed(7), longitude: input.longitude.toFixed(7), accuracy: input.accuracy !== undefined ? input.accuracy.toFixed(2) : undefined, sharingStatus: input.sharingStatus } as const;
  if (existing[0]) {
    await db.update(providerLocations).set(values).where(and(eq(providerLocations.id, existing[0].id), eq(providerLocations.providerId, profile.id), eq(providerLocations.requestId, input.requestId)));
  } else {
    await db.insert(providerLocations).values({ providerId: profile.id, requestId: input.requestId, ...values });
  }
  const updated = await db.select().from(providerLocations).where(and(eq(providerLocations.requestId, input.requestId), eq(providerLocations.providerId, profile.id))).limit(1);
  return { success: true as const, updatedAt: updated[0]?.updatedAt ?? new Date(), sharingStatus: input.sharingStatus };
}


async function getConversationContext(userId: number, requestId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select({ request: serviceRequests, providerUserId: providerProfiles.userId }).from(serviceRequests).leftJoin(providerProfiles, eq(serviceRequests.assignedProviderId, providerProfiles.id)).where(eq(serviceRequests.id, requestId)).limit(1);
  const row = rows[0];
  if (!row || !row.request.assignedProviderId || !row.providerUserId) throw new Error("Conversation is not available until a provider is assigned");
  if (userId !== row.request.customerId && userId !== row.providerUserId) throw new Error("You are not a participant in this conversation");
  const allowedStatuses = ["ASSIGNED", "ACCEPTED", "QUOTE_PENDING", "QUOTE_ACCEPTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "REVIEWED", "CLAIM_OPEN"];
  if (!allowedStatuses.includes(row.request.status)) throw new Error("Conversation is closed for this request");
  return { db, request: row.request, providerUserId: row.providerUserId, recipientId: userId === row.request.customerId ? row.providerUserId : row.request.customerId };
}

export async function listConversationMessages(userId: number, requestId: number) {
  const { db, request } = await getConversationContext(userId, requestId);
  const items = await db.select().from(messages).where(eq(messages.requestId, request.id)).orderBy(messages.createdAt).limit(100);
  const unreadRows = await db.select({ unreadCount: count(messages.id) }).from(messages).where(and(eq(messages.requestId, request.id), eq(messages.recipientId, userId), isNull(messages.readAt)));
  return { items, unreadCount: Number(unreadRows[0]?.unreadCount ?? 0) };
}

export async function sendConversationMessage(input: { userId: number; requestId: number; body: string; idempotencyKey: string }) {
  const body = input.body.trim();
  if (!body || body.length > 2000) throw new Error("Message must contain between 1 and 2000 characters");
  const { db, request, recipientId } = await getConversationContext(input.userId, input.requestId);
  const existing = await db.select().from(messages).where(and(eq(messages.senderId, input.userId), eq(messages.idempotencyKey, input.idempotencyKey))).limit(1);
  let created = existing[0];
  if (created && created.requestId !== input.requestId) throw new Error("Idempotency key already used for another conversation");
  if (!created) {
    try {
      await db.insert(messages).values({ requestId: input.requestId, senderId: input.userId, recipientId, body, idempotencyKey: input.idempotencyKey });
    } catch (error) {
      const concurrent = await db.select().from(messages).where(and(eq(messages.senderId, input.userId), eq(messages.idempotencyKey, input.idempotencyKey))).limit(1);
      if (!concurrent[0]) throw error;
      created = concurrent[0];
    }
    if (!created) {
      const saved = await db.select().from(messages).where(and(eq(messages.requestId, input.requestId), eq(messages.senderId, input.userId), eq(messages.idempotencyKey, input.idempotencyKey))).limit(1);
      created = saved[0];
    }
  }
  if (!created) throw new Error("Message was not saved");
  if (created.requestId !== input.requestId) throw new Error("Idempotency key already used for another conversation");
  try {
    await createNotification({ userId: recipientId, type: "message", title: "Nouveau message", body: "Vous avez reçu un nouveau message concernant cette demande.", reference: request.reference, dedupeKey: `message:${created.id}` });
  } catch (error) {
    console.warn("[Notifications] Failed to notify conversation participant", error);
  }
  return created;
}

export async function markConversationMessagesRead(input: { userId: number; requestId: number }) {
  const { db } = await getConversationContext(input.userId, input.requestId);
  await db.update(messages).set({ readAt: new Date() }).where(and(eq(messages.requestId, input.requestId), eq(messages.recipientId, input.userId), isNull(messages.readAt)));
  return { success: true as const };
}


export async function getAdminAnalytics(days: 7 | 30 | 90 = 30) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const activeStatuses = ["REQUESTED", "ASSIGNED", "ACCEPTED", "QUOTE_PENDING", "QUOTE_ACCEPTED", "SCHEDULED", "IN_PROGRESS", "CLAIM_OPEN", "REFUND_PENDING"] as const;
  const requestCountSql = sql<number>`count(*)`;
  const completedCountSql = sql<number>`sum(case when ${serviceRequests.status} in ('COMPLETED', 'REVIEWED') then 1 else 0 end)`;
  const dateBucketSql = sql<string>`DATE_FORMAT(${serviceRequests.createdAt}, '%Y-%m-%d')`;
  const serviceLabelSql = sql<string>`COALESCE(${services.name}, 'Demande personnalisée')`;

  const [requestTotals, statusRows, dailyRows, userCountRows, providerStatusRows, reviewSummaryRows, openReportRows, serviceRows, zoneRows, responseRows] = await Promise.all([
    db.select({ requests: requestCountSql, completed: completedCountSql })
      .from(serviceRequests)
      .where(gte(serviceRequests.createdAt, since)),
    db.select({ status: serviceRequests.status, total: requestCountSql })
      .from(serviceRequests)
      .where(gte(serviceRequests.createdAt, since))
      .groupBy(serviceRequests.status)
      .orderBy(desc(requestCountSql)),
    db.select({ day: dateBucketSql, requests: requestCountSql, completed: completedCountSql })
      .from(serviceRequests)
      .where(gte(serviceRequests.createdAt, since))
      .groupBy(sql`1`)
      .orderBy(sql`1`),
    db.select({ total: sql<number>`count(*)` })
      .from(users)
      .where(gte(users.createdAt, since)),
    db.select({ status: providerProfiles.verificationStatus, total: sql<number>`count(*)` })
      .from(providerProfiles)
      .groupBy(providerProfiles.verificationStatus),
    db.select({ total: sql<number>`count(*)`, average: sql<number>`coalesce(avg(${reviews.rating}), 0)` })
      .from(reviews)
      .where(and(eq(reviews.status, "published"), gte(reviews.createdAt, since))),
    db.select({ total: sql<number>`count(*)` })
      .from(reviewReports)
      .where(eq(reviewReports.status, "open")),
    db.select({ service: serviceLabelSql, total: requestCountSql })
      .from(serviceRequests)
      .leftJoin(services, eq(serviceRequests.serviceId, services.id))
      .where(gte(serviceRequests.createdAt, since))
      .groupBy(serviceLabelSql)
      .orderBy(desc(requestCountSql))
      .limit(6),
    db.select({ commune: serviceRequests.commune, quartier: serviceRequests.quartier, total: requestCountSql })
      .from(serviceRequests)
      .where(gte(serviceRequests.createdAt, since))
      .groupBy(serviceRequests.commune, serviceRequests.quartier)
      .orderBy(desc(requestCountSql))
      .limit(6),
    db.select({ decision: missionResponses.decision, total: sql<number>`count(*)` })
      .from(missionResponses)
      .where(gte(missionResponses.createdAt, since))
      .groupBy(missionResponses.decision),
  ]);

  const asNumber = (value: unknown) => Number(value ?? 0);
  const requests = asNumber(requestTotals[0]?.requests);
  const completed = asNumber(requestTotals[0]?.completed);
  const active = statusRows.filter((row) => activeStatuses.includes(row.status as (typeof activeStatuses)[number])).reduce((total, row) => total + asNumber(row.total), 0);
  const responseCounts = Object.fromEntries(responseRows.map((row) => [row.decision, asNumber(row.total)]));
  const responses = Object.values(responseCounts).reduce((total, value) => total + value, 0);

  return {
    periodDays: days,
    periodStart: since.toISOString(),
    generatedAt: new Date().toISOString(),
    overview: {
      requests,
      completed,
      active,
      completionRate: requests ? Math.round((completed / requests) * 1000) / 10 : 0,
      newUsers: asNumber(userCountRows[0]?.total),
      publishedReviews: asNumber(reviewSummaryRows[0]?.total),
      averageRating: Math.round(asNumber(reviewSummaryRows[0]?.average) * 10) / 10,
      openReports: asNumber(openReportRows[0]?.total),
    },
    statusBreakdown: statusRows.map((row) => ({ status: row.status, total: asNumber(row.total) })),
    dailyActivity: dailyRows.map((row) => ({ day: row.day, requests: asNumber(row.requests), completed: asNumber(row.completed) })),
    providers: providerStatusRows.map((row) => ({ status: row.status, total: asNumber(row.total) })),
    demandByService: serviceRows.map((row) => ({ service: row.service, total: asNumber(row.total) })),
    demandByZone: zoneRows.map((row) => ({ commune: row.commune, quartier: row.quartier, total: asNumber(row.total) })),
    missionResponses: { accepted: responseCounts.accepted ?? 0, refused: responseCounts.refused ?? 0, total: responses, acceptanceRate: responses ? Math.round(((responseCounts.accepted ?? 0) / responses) * 1000) / 10 : 0 },
    unavailableMetrics: ["revenue", "payments", "commissions"],
  };
}

export async function listAdminProviders() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const profiles = await db
    .select({ profile: providerProfiles, userName: users.name, userEmail: users.email })
    .from(providerProfiles)
    .innerJoin(users, eq(providerProfiles.userId, users.id))
    .orderBy(desc(providerProfiles.createdAt));
  const serviceRows = await db
    .select({ providerId: providerServices.providerId, id: services.id, name: services.name })
    .from(providerServices)
    .innerJoin(services, eq(providerServices.serviceId, services.id));
  const zoneRows = await db
    .select({ providerId: providerZones.providerId, id: zones.id, commune: zones.commune, quartier: zones.quartier })
    .from(providerZones)
    .innerJoin(zones, eq(providerZones.zoneId, zones.id));
  return profiles.map(({ profile, userName, userEmail }) => ({
    ...profile,
    userName,
    userEmail,
    services: serviceRows.filter((row) => row.providerId === profile.id).map(({ id, name }) => ({ id, name })),
    zones: zoneRows.filter((row) => row.providerId === profile.id).map(({ id, commune, quartier }) => ({ id, commune, quartier })),
  }));
}

export async function reviewProvider(input: { adminUserId: number; providerId: number; status: "pending" | "verified" | "suspended"; note?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existingRows = await db.select().from(providerProfiles).where(eq(providerProfiles.id, input.providerId)).limit(1);
  const existing = existingRows[0];
  if (!existing) throw new Error("Provider profile not found");
  const updated = await db.transaction(async (tx) => {
    const rows = await tx
      .update(providerProfiles)
      .set({
        verificationStatus: input.status,
        verificationNote: input.note?.trim() || existing.verificationNote,
        verifiedBy: input.status === "verified" ? input.adminUserId : null,
        verifiedAt: input.status === "verified" ? new Date() : null,
      })
      .where(eq(providerProfiles.id, input.providerId));
    if (((rows as any).affectedRows ?? (rows as any)[0]?.affectedRows ?? 1) !== 1) throw new Error("Provider verification update failed");
    await tx.insert(adminAuditLogs).values({ adminUserId: input.adminUserId, action: `provider.${input.status}`, entityType: "provider", entityId: input.providerId, note: input.note });
    const saved = await tx.select().from(providerProfiles).where(eq(providerProfiles.id, input.providerId)).limit(1);
    if (!saved[0]) throw new Error("Provider verification could not be loaded");
    return saved[0];
  });
  const labels = { pending: "remis en attente", verified: "vérifié", suspended: "suspendu" } as const;
  try {
    await createNotification({
      userId: updated.userId,
      type: "system",
      title: "Statut de votre profil prestataire",
      body: `Votre profil Barahub est maintenant ${labels[input.status]}${input.note ? ` : ${input.note}` : "."}`,
      dedupeKey: `provider:${updated.id}:verification:${input.status}:${Date.now()}`,
    });
  } catch (error) {
    console.warn("[Notifications] Failed to notify provider about verification", error);
  }
  return updated;
}

export async function listAssignableProviders(requestId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const requestRows = await db.select().from(serviceRequests).where(eq(serviceRequests.id, requestId)).limit(1);
  const request = requestRows[0];
  if (!request || request.status !== "REQUESTED" || request.assignedProviderId !== null) return [];
  const profiles = await db
    .select({ id: providerProfiles.id, displayName: providerProfiles.displayName, userId: providerProfiles.userId })
    .from(providerProfiles)
    .where(eq(providerProfiles.verificationStatus, "verified"))
    .orderBy(providerProfiles.displayName);
  const serviceRows = await db.select({ providerId: providerServices.providerId, serviceId: providerServices.serviceId }).from(providerServices);
  const zoneRows = await db
    .select({ providerId: providerZones.providerId, commune: zones.commune, quartier: zones.quartier })
    .from(providerZones)
    .innerJoin(zones, eq(providerZones.zoneId, zones.id))
    .where(eq(zones.active, true));
  return profiles.filter((profile) => {
    const coversService = !request.serviceId || serviceRows.some((row) => row.providerId === profile.id && row.serviceId === request.serviceId);
    const coversZone = zoneRows.some((row) => row.providerId === profile.id && row.commune === request.commune && row.quartier === request.quartier);
    return coversService && coversZone;
  });
}

export async function assignRequestToProvider(input: { adminUserId: number; requestId: number; providerId: number; note?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM serviceRequests WHERE id = ${input.requestId} FOR UPDATE`);
    const requestRows = await tx.select().from(serviceRequests).where(eq(serviceRequests.id, input.requestId)).limit(1);
    const request = requestRows[0];
    if (!request) throw new Error("Request not found");
    if (request.status !== "REQUESTED" || request.assignedProviderId !== null) throw new Error("Cette demande est déjà affectée ou n'est plus disponible");
    const profileRows = await tx.select().from(providerProfiles).where(eq(providerProfiles.id, input.providerId)).limit(1);
    const profile = profileRows[0];
    if (!profile) throw new Error("Provider profile not found");
    if (profile.verificationStatus !== "verified") throw new Error("Seul un prestataire vérifié peut recevoir une mission");
    const zoneRows = await tx
      .select({ id: providerZones.zoneId })
      .from(providerZones)
      .innerJoin(zones, eq(providerZones.zoneId, zones.id))
      .where(and(eq(providerZones.providerId, profile.id), eq(zones.active, true), eq(zones.commune, request.commune), eq(zones.quartier, request.quartier)))
      .limit(1);
    if (!zoneRows[0]) throw new Error("Ce prestataire ne couvre pas la zone de la demande");
    if (request.serviceId) {
      const serviceRows = await tx
        .select({ id: providerServices.serviceId })
        .from(providerServices)
        .where(and(eq(providerServices.providerId, profile.id), eq(providerServices.serviceId, request.serviceId)))
        .limit(1);
      if (!serviceRows[0]) throw new Error("Ce prestataire ne propose pas la prestation demandée");
    }
    const updatedRows = await tx
      .update(serviceRequests)
      .set({ assignedProviderId: profile.id, status: "ASSIGNED" })
      .where(and(eq(serviceRequests.id, request.id), eq(serviceRequests.status, "REQUESTED"), isNull(serviceRequests.assignedProviderId)));
    const affectedRows = (updatedRows as any).affectedRows ?? (updatedRows as any)[0]?.affectedRows ?? 0;
    if (affectedRows !== 1) throw new Error("La demande a changé avant l'affectation");
    await tx.insert(requestStatusHistory).values({ requestId: request.id, fromStatus: "REQUESTED", toStatus: "ASSIGNED", actorUserId: input.adminUserId, note: input.note || "Affectation manuelle par l'administration" });
    await tx.insert(adminAuditLogs).values({ adminUserId: input.adminUserId, action: "request.assign", entityType: "serviceRequest", entityId: request.id, note: input.note });
    const saved = await tx.select().from(serviceRequests).where(eq(serviceRequests.id, request.id)).limit(1);
    if (!saved[0]) throw new Error("Affected request could not be loaded");
    return { request: saved[0], providerUserId: profile.userId, providerName: profile.displayName };
  });
  try {
    await Promise.all([
      createNotification({ userId: result.providerUserId, type: "new_mission", title: "Mission affectée par Barahub", body: `La demande ${result.request.reference} vous a été affectée dans ${result.request.commune} à ${result.request.quartier}.`, reference: result.request.reference, dedupeKey: `mission:${result.request.id}:admin-assigned:${result.providerUserId}` }),
      createNotification({ userId: result.request.customerId, type: "mission_update", title: "Prestataire affecté", body: `Un prestataire a été affecté ? votre demande ${result.request.reference}.`, reference: result.request.reference, dedupeKey: `mission:${result.request.id}:admin-assignment:customer` }),
    ]);
  } catch (error) {
    console.warn("[Notifications] Failed to notify about manual assignment", error);
  }
  return result.request;
}

export async function listAdminCategories() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select().from(categories).orderBy(categories.sortOrder, categories.name);
  const counts = await db.select({ categoryId: services.categoryId, total: count(services.id) }).from(services).groupBy(services.categoryId);
  return rows.map((category) => ({ ...category, serviceCount: Number(counts.find((item) => item.categoryId === category.id)?.total ?? 0) }));
}

export async function saveCategory(input: { adminUserId: number; id?: number; slug?: string; name: string; description?: string; active?: boolean; sortOrder?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const name = input.name.trim();
  if (name.length < 2 || name.length > 120) throw new Error("Le nom de catégorie doit contenir entre 2 et 120 caractères");
  const slug = normalizeSlug(input.slug || name);
  if (!slug) throw new Error("Le slug de catégorie est invalide");
  return db.transaction(async (tx) => {
    let categoryId = input.id;
    if (categoryId) {
      const existing = await tx.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
      if (!existing[0]) throw new Error("Category not found");
      await tx.update(categories).set({ slug, name, description: input.description?.trim() || null, active: input.active ?? existing[0].active, sortOrder: input.sortOrder ?? existing[0].sortOrder }).where(eq(categories.id, categoryId));
      await tx.insert(adminAuditLogs).values({ adminUserId: input.adminUserId, action: "catalog.category.update", entityType: "category", entityId: categoryId, note: name });
    } else {
      const inserted = await tx.insert(categories).values({ slug, name, description: input.description?.trim() || null, active: input.active ?? true, sortOrder: input.sortOrder ?? 0 });
      categoryId = insertedId(inserted);
      if (!categoryId) throw new Error("Category creation failed");
      await tx.insert(adminAuditLogs).values({ adminUserId: input.adminUserId, action: "catalog.category.create", entityType: "category", entityId: categoryId, note: name });
    }
    const saved = await tx.select().from(categories).where(eq(categories.id, categoryId!)).limit(1);
    if (!saved[0]) throw new Error("Category could not be loaded");
    return saved[0];
  });
}

export async function listAdminServices() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db
    .select({ service: services, categoryName: categories.name })
    .from(services)
    .innerJoin(categories, eq(services.categoryId, categories.id))
    .orderBy(services.sortOrder, services.name);
}

export async function saveService(input: {
  adminUserId: number;
  id?: number;
  categoryId: number;
  slug?: string;
  name: string;
  description: string;
  pricingMode: "fixed" | "quote";
  fixedPriceXof?: number | null;
  diagnosticRequired: boolean;
  durationMinutes?: number | null;
  travelTerms?: string;
  excludedSupplies?: string;
  safetyNotes?: string;
  active?: boolean;
  sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const name = input.name.trim();
  const description = input.description.trim();
  if (name.length < 2 || name.length > 160) throw new Error("Le nom de prestation doit contenir entre 2 et 160 caractères");
  if (description.length < 10) throw new Error("La description de prestation est trop courte");
  if (input.durationMinutes !== undefined && input.durationMinutes !== null && (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0 || input.durationMinutes > 720)) throw new Error("La durée doit être comprise entre 1 et 720 minutes");
  validateServicePricingInput(input);
  const slug = normalizeSlug(input.slug || name);
  if (!slug) throw new Error("Le slug de prestation est invalide");
  return db.transaction(async (tx) => {
    const categoryRows = await tx.select().from(categories).where(eq(categories.id, input.categoryId)).limit(1);
    if (!categoryRows[0]) throw new Error("Category not found");
    const values = {
      categoryId: input.categoryId,
      slug,
      name,
      description,
      pricingMode: input.pricingMode,
      fixedPriceXof: input.pricingMode === "fixed" ? Number(input.fixedPriceXof).toFixed(2) : null,
      diagnosticRequired: input.diagnosticRequired,
      durationMinutes: input.durationMinutes ?? null,
      travelTerms: input.travelTerms?.trim() || null,
      excludedSupplies: input.excludedSupplies?.trim() || null,
      safetyNotes: input.safetyNotes?.trim() || null,
      active: input.active ?? true,
      sortOrder: input.sortOrder ?? 0,
    };
    let serviceId = input.id;
    if (serviceId) {
      const existing = await tx.select().from(services).where(eq(services.id, serviceId)).limit(1);
      if (!existing[0]) throw new Error("Service not found");
      await tx.update(services).set(values).where(eq(services.id, serviceId));
      await tx.insert(adminAuditLogs).values({ adminUserId: input.adminUserId, action: "catalog.service.update", entityType: "service", entityId: serviceId, note: name });
    } else {
      const inserted = await tx.insert(services).values(values);
      serviceId = insertedId(inserted);
      if (!serviceId) throw new Error("Service creation failed");
      await tx.insert(adminAuditLogs).values({ adminUserId: input.adminUserId, action: "catalog.service.create", entityType: "service", entityId: serviceId, note: name });
    }
    const saved = await tx.select().from(services).where(eq(services.id, serviceId!)).limit(1);
    if (!saved[0]) throw new Error("Service could not be loaded");
    return saved[0];
  });
}

export async function listAdminZones() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(zones).orderBy(zones.commune, zones.quartier);
}

export async function saveZone(input: { adminUserId: number; id?: number; commune: string; quartier: string; active?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const commune = input.commune.trim();
  const quartier = input.quartier.trim();
  if (commune.length < 2 || commune.length > 96 || quartier.length < 2 || quartier.length > 120) throw new Error("Commune ou quartier invalide");
  return db.transaction(async (tx) => {
    let zoneId = input.id;
    if (zoneId) {
      const existing = await tx.select().from(zones).where(eq(zones.id, zoneId)).limit(1);
      if (!existing[0]) throw new Error("Zone not found");
      await tx.update(zones).set({ commune, quartier, active: input.active ?? existing[0].active }).where(eq(zones.id, zoneId));
      await tx.insert(adminAuditLogs).values({ adminUserId: input.adminUserId, action: "catalog.zone.update", entityType: "zone", entityId: zoneId, note: `${commune} à ${quartier}` });
    } else {
      const inserted = await tx.insert(zones).values({ commune, quartier, active: input.active ?? true });
      zoneId = insertedId(inserted);
      if (!zoneId) throw new Error("Zone creation failed");
      await tx.insert(adminAuditLogs).values({ adminUserId: input.adminUserId, action: "catalog.zone.create", entityType: "zone", entityId: zoneId, note: `${commune} à ${quartier}` });
    }
    const saved = await tx.select().from(zones).where(eq(zones.id, zoneId!)).limit(1);
    if (!saved[0]) throw new Error("Zone could not be loaded");
    return saved[0];
  });
}

export async function listCustomerComplaints(customerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db
    .select({ complaint: complaints, requestReference: serviceRequests.reference, requestStatus: serviceRequests.status })
    .from(complaints)
    .innerJoin(serviceRequests, eq(complaints.requestId, serviceRequests.id))
    .where(eq(complaints.customerId, customerId))
    .orderBy(desc(complaints.createdAt));
}

export async function createComplaint(input: { userId: number; requestId: number; subject: string; description: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const subject = input.subject.trim();
  const description = input.description.trim();
  if (subject.length < 3 || subject.length > 180) throw new Error("Le sujet de la réclamation doit contenir entre 3 et 180 caractères");
  if (description.length < 12 || description.length > 4000) throw new Error("La réclamation doit contenir entre 12 et 4000 caractères");
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM serviceRequests WHERE id = ${input.requestId} FOR UPDATE`);
    const requestRows = await tx.select().from(serviceRequests).where(and(eq(serviceRequests.id, input.requestId), eq(serviceRequests.customerId, input.userId))).limit(1);
    const request = requestRows[0];
    if (!request) throw new Error("Request not found");
    const activeRows = await tx.select().from(complaints).where(and(eq(complaints.requestId, request.id), inArray(complaints.status, ["open", "in_progress"]))).limit(1);
    if (activeRows[0]) throw new Error("Une réclamation active existe déjà pour cette demande");
    if (!isComplaintEligibleStatus(request.status)) throw new Error("Une réclamation ne peut pas être ouverte pour ce statut");
    const inserted = await tx.insert(complaints).values({
      requestId: request.id,
      customerId: input.userId,
      subject,
      description,
      status: "open",
      previousRequestStatus: request.status,
    });
    const complaintId = insertedId(inserted);
    if (!complaintId) throw new Error("Complaint creation failed");
    await tx.update(serviceRequests).set({ status: "CLAIM_OPEN" }).where(and(eq(serviceRequests.id, request.id), eq(serviceRequests.status, request.status)));
    await tx.insert(requestStatusHistory).values({ requestId: request.id, fromStatus: request.status, toStatus: "CLAIM_OPEN", actorUserId: input.userId, note: `Réclamation ouverte : ${subject}` });
    const saved = await tx.select().from(complaints).where(eq(complaints.id, complaintId)).limit(1);
    if (!saved[0]) throw new Error("Complaint could not be loaded");
    return { complaint: saved[0], request };
  });
  try {
    const providerRows = result.request.assignedProviderId
      ? await db.select({ userId: providerProfiles.userId }).from(providerProfiles).where(eq(providerProfiles.id, result.request.assignedProviderId)).limit(1)
      : [];
    const recipients = new Set<number>([result.request.customerId]);
    if (providerRows[0]?.userId) recipients.add(providerRows[0].userId);
    await Promise.all([...recipients].map((userId) => createNotification({
      userId,
      type: "mission_update",
      title: "Réclamation ouverte",
      body: `La demande ${result.request.reference} fait l'objet d'une réclamation suivie par Barahub.`,
      reference: result.request.reference,
      dedupeKey: `complaint:${result.complaint.id}:${userId}`,
    })));
  } catch (error) {
    console.warn("[Notifications] Failed to notify about complaint", error);
  }
  return result.complaint;
}

export async function listAdminComplaints() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db
    .select({
      complaint: complaints,
      requestReference: serviceRequests.reference,
      requestStatus: serviceRequests.status,
      customerName: users.name,
      providerName: providerProfiles.displayName,
    })
    .from(complaints)
    .innerJoin(serviceRequests, eq(complaints.requestId, serviceRequests.id))
    .innerJoin(users, eq(complaints.customerId, users.id))
    .leftJoin(providerProfiles, eq(serviceRequests.assignedProviderId, providerProfiles.id))
    .orderBy(desc(complaints.createdAt));
}

export async function resolveComplaint(input: { adminUserId: number; complaintId: number; status: "in_progress" | "resolved" | "dismissed"; resolutionNote?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.transaction(async (tx) => {
    const rows = await tx.select().from(complaints).where(eq(complaints.id, input.complaintId)).limit(1);
    const existing = rows[0];
    if (!existing) throw new Error("Complaint not found");
    if (!canTransitionComplaint(existing.status, input.status)) throw new Error("Cette réclamation a déjà été clôturée");
    const closing = isClosedComplaintStatus(input.status);
    await tx.update(complaints).set({
      status: input.status,
      resolutionNote: input.resolutionNote?.trim() || existing.resolutionNote,
      resolvedBy: closing ? input.adminUserId : existing.resolvedBy,
      resolvedAt: closing ? new Date() : existing.resolvedAt,
    }).where(and(eq(complaints.id, input.complaintId), eq(complaints.status, existing.status)));
    let requestStatus: string | null = null;
    if (closing) {
      const requestRows = await tx.select().from(serviceRequests).where(eq(serviceRequests.id, existing.requestId)).limit(1);
      const request = requestRows[0];
      if (!request) throw new Error("Request not found");
      if (request.status === "CLAIM_OPEN") {
        requestStatus = refundRestoreStatus({ previousRequestStatus: existing.previousRequestStatus, fallback: "COMPLETED" });
        await tx.update(serviceRequests).set({ status: requestStatus as any }).where(and(eq(serviceRequests.id, request.id), eq(serviceRequests.status, "CLAIM_OPEN")));
        await tx.insert(requestStatusHistory).values({ requestId: request.id, fromStatus: "CLAIM_OPEN", toStatus: requestStatus, actorUserId: input.adminUserId, note: `Réclamation ${input.status === "resolved" ? "résolue" : "rejetée"} par l'administration` });
      }
    }
    await tx.insert(adminAuditLogs).values({ adminUserId: input.adminUserId, action: `complaint.${input.status}`, entityType: "complaint", entityId: input.complaintId, note: input.resolutionNote });
    const saved = await tx.select().from(complaints).where(eq(complaints.id, input.complaintId)).limit(1);
    if (!saved[0]) throw new Error("Complaint could not be loaded");
    return { complaint: saved[0], customerId: existing.customerId, requestStatus };
  });
  try {
    const requestRows = await db.select({ reference: serviceRequests.reference }).from(serviceRequests).where(eq(serviceRequests.id, result.complaint.requestId)).limit(1);
    await createNotification({
      userId: result.customerId,
      type: "mission_update",
      title: "Réclamation mise à jour",
      body: `Votre réclamation est maintenant ${input.status}${input.resolutionNote ? ` : ${input.resolutionNote}` : "."}`,
      reference: requestRows[0]?.reference,
      dedupeKey: `complaint:${result.complaint.id}:status:${input.status}:${Date.now()}`,
    });
  } catch (error) {
    console.warn("[Notifications] Failed to notify customer about complaint resolution", error);
  }
  return result.complaint;
}

export async function listAdminRefunds() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db
    .select({
      refund: refunds,
      requestReference: serviceRequests.reference,
      requestStatus: serviceRequests.status,
      customerName: users.name,
      paymentMethod: payments.method,
    })
    .from(refunds)
    .innerJoin(serviceRequests, eq(refunds.requestId, serviceRequests.id))
    .innerJoin(payments, eq(refunds.paymentId, payments.id))
    .innerJoin(users, eq(payments.payerUserId, users.id))
    .orderBy(desc(refunds.createdAt));
}

export async function createRefund(input: { adminUserId: number; paymentId: number; reason: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const reason = input.reason.trim();
  if (reason.length < 5 || reason.length > 1200) throw new Error("Le motif du remboursement doit contenir entre 5 et 1200 caractères");
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM payments WHERE id = ${input.paymentId} FOR UPDATE`);
    const paymentRows = await tx.select().from(payments).where(eq(payments.id, input.paymentId)).limit(1);
    const payment = paymentRows[0];
    if (!payment) throw new Error("Payment not found");
    const existingRefund = await tx.select().from(refunds).where(eq(refunds.paymentId, payment.id)).limit(1);
    if (existingRefund[0]) return { refund: existingRefund[0], customerId: payment.payerUserId, duplicate: true };
    if (!canRefundPaymentStatus(payment.status)) throw new Error("Seul un paiement confirmé peut être remboursé");
    const requestRows = await tx.select().from(serviceRequests).where(eq(serviceRequests.id, payment.requestId)).limit(1);
    const request = requestRows[0];
    if (!request) throw new Error("Request not found");
    if (!canCreateRefundForRequestStatus(request.status)) throw new Error("Cette demande ne peut pas être remboursée dans son statut actuel");
    const inserted = await tx.insert(refunds).values({ requestId: request.id, paymentId: payment.id, amountXof: payment.amountXof, reason, status: "pending", previousRequestStatus: request.status });
    const refundId = insertedId(inserted);
    if (!refundId) throw new Error("Refund creation failed");
    await tx.update(serviceRequests).set({ status: "REFUND_PENDING" }).where(and(eq(serviceRequests.id, request.id), eq(serviceRequests.status, request.status)));
    await tx.insert(requestStatusHistory).values({ requestId: request.id, fromStatus: request.status, toStatus: "REFUND_PENDING", actorUserId: input.adminUserId, note: `Remboursement demandé : ${reason}` });
    await tx.insert(adminAuditLogs).values({ adminUserId: input.adminUserId, action: "refund.create", entityType: "refund", entityId: refundId, note: reason });
    const saved = await tx.select().from(refunds).where(eq(refunds.id, refundId)).limit(1);
    if (!saved[0]) throw new Error("Refund could not be loaded");
    return { refund: saved[0], customerId: payment.payerUserId, duplicate: false };
  });
  if (!result.duplicate) {
    try {
      await createNotification({
        userId: result.customerId,
        type: "system",
        title: "Remboursement en cours",
        body: `Un remboursement de ${Number(result.refund.amountXof).toLocaleString("fr-FR")} FCFA est en cours de traitement.`,
        dedupeKey: `refund:${result.refund.id}:created`,
      });
    } catch (error) {
      console.warn("[Notifications] Failed to notify customer about refund", error);
    }
  }
  return result.refund;
}

export async function processRefund(input: { adminUserId: number; refundId: number; status: "completed" | "rejected"; note?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.transaction(async (tx) => {
    const rows = await tx.select().from(refunds).where(eq(refunds.id, input.refundId)).limit(1);
    const existing = rows[0];
    if (!existing) throw new Error("Refund not found");
    if (!canTransitionRefund(existing.status, input.status)) throw new Error("Ce remboursement a déjà été traité");
    await tx.update(refunds).set({ status: input.status, processedBy: input.adminUserId, processedAt: new Date() }).where(and(eq(refunds.id, input.refundId), eq(refunds.status, "pending")));
    let restoredStatus: string | null = null;
    if (input.status === "completed") {
      await tx.update(payments).set({ status: "refunded" }).where(eq(payments.id, existing.paymentId));
      await tx.update(serviceRequests).set({ status: "REFUNDED" }).where(and(eq(serviceRequests.id, existing.requestId), eq(serviceRequests.status, "REFUND_PENDING")));
      await tx.insert(requestStatusHistory).values({ requestId: existing.requestId, fromStatus: "REFUND_PENDING", toStatus: "REFUNDED", actorUserId: input.adminUserId, note: input.note || "Remboursement confirmé par l'administration" });
    } else {
      restoredStatus = refundRestoreStatus({ previousRequestStatus: existing.previousRequestStatus, fallback: "COMPLETED" });
      await tx.update(serviceRequests).set({ status: restoredStatus as any }).where(and(eq(serviceRequests.id, existing.requestId), eq(serviceRequests.status, "REFUND_PENDING")));
      await tx.insert(requestStatusHistory).values({ requestId: existing.requestId, fromStatus: "REFUND_PENDING", toStatus: restoredStatus, actorUserId: input.adminUserId, note: input.note || "Remboursement rejeté par l'administration" });
    }
    await tx.insert(adminAuditLogs).values({ adminUserId: input.adminUserId, action: `refund.${input.status}`, entityType: "refund", entityId: input.refundId, note: input.note });
    const saved = await tx.select().from(refunds).where(eq(refunds.id, input.refundId)).limit(1);
    if (!saved[0]) throw new Error("Refund could not be loaded");
    const paymentRows = await tx.select().from(payments).where(eq(payments.id, existing.paymentId)).limit(1);
    return { refund: saved[0], customerId: paymentRows[0]?.payerUserId ?? null, requestId: existing.requestId };
  });
  if (result.customerId) {
    try {
      const requestRows = await db.select({ reference: serviceRequests.reference }).from(serviceRequests).where(eq(serviceRequests.id, result.requestId)).limit(1);
      await createNotification({
        userId: result.customerId,
        type: "system",
        title: input.status === "completed" ? "Remboursement effectué" : "Remboursement rejeté",
        body: input.status === "completed" ? `Le remboursement de ${Number(result.refund.amountXof).toLocaleString("fr-FR")} FCFA a été enregistré.` : `Le remboursement n'a pas été retenu${input.note ? ` : ${input.note}` : "."}`,
        reference: requestRows[0]?.reference,
        dedupeKey: `refund:${result.refund.id}:${input.status}`,
      });
    } catch (error) {
      console.warn("[Notifications] Failed to notify customer about refund processing", error);
    }
  }
  return result.refund;
}
