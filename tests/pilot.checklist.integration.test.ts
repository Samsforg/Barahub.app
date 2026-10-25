import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";

import {
  adminAuditLogs,
  categories,
  complaints,
  missionResponses,
  notifications,
  payments,
  providerProfiles,
  providerServices,
  providerZones,
  refunds,
  requestStatusHistory,
  serviceRequests,
  services,
  users,
  zones,
} from "../drizzle/schema";
import {
  assignRequestToProvider,
  createComplaint,
  createRefund,
  getDb,
  listAssignableProviders,
  processRefund,
  resolveComplaint,
  respondToMission,
  reviewProvider,
  saveCategory,
  saveService,
  saveZone,
} from "../server/db";

const testDatabaseUrl = process.env.BARAHUB_TEST_DATABASE_URL;
const suite = testDatabaseUrl ? describe : describe.skip;
const suffix = `checklist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function insertedId(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  return Number((header as { insertId?: number } | null | undefined)?.insertId);
}

suite("pilot checklist guards (persisted)", () => {
  const ids = {
    admin: 0,
    customer: 0,
    providerUser: 0,
    outOfZoneUser: 0,
    suspendedUser: 0,
    categoryId: 0,
    serviceId: 0,
    zoneId: 0,
    otherZoneId: 0,
    providerId: 0,
    outOfZoneProviderId: 0,
    suspendedProviderId: 0,
    assignRequestId: 0,
    guardRequestId: 0,
    suspendRequestId: 0,
    complaintRequestId: 0,
    refundRequestId: 0,
    paymentId: 0,
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    const db = await getDb();
    if (!db) throw new Error("Test database unavailable");

    const admin = await db.insert(users).values({ openId: `${suffix}-admin`, name: "Admin checklist", email: `${suffix}-admin@example.com`, role: "admin" });
    const customer = await db.insert(users).values({ openId: `${suffix}-customer`, name: "Client checklist", email: `${suffix}-customer@example.com`, role: "user" });
    const provider = await db.insert(users).values({ openId: `${suffix}-provider`, name: "Prestataire checklist", email: `${suffix}-provider@example.com`, role: "user" });
    const outOfZone = await db.insert(users).values({ openId: `${suffix}-outzone`, name: "Prestataire hors zone", email: `${suffix}-outzone@example.com`, role: "user" });
    const suspended = await db.insert(users).values({ openId: `${suffix}-suspended`, name: "Prestataire suspendu", email: `${suffix}-suspended@example.com`, role: "user" });
    ids.admin = insertedId(admin);
    ids.customer = insertedId(customer);
    ids.providerUser = insertedId(provider);
    ids.outOfZoneUser = insertedId(outOfZone);
    ids.suspendedUser = insertedId(suspended);

    const category = await saveCategory({ adminUserId: ids.admin, slug: `${suffix}-cat`, name: "Catégorie checklist", description: "Catégorie créée par le test de checklist." });
    ids.categoryId = category.id;
    const service = await saveService({
      adminUserId: ids.admin,
      categoryId: ids.categoryId,
      slug: `${suffix}-service`,
      name: "Prestation checklist",
      description: "Prestation créée par le test de checklist.",
      pricingMode: "quote",
      diagnosticRequired: false,
    });
    ids.serviceId = service.id;
    const zone = await saveZone({ adminUserId: ids.admin, commune: `Commune ${suffix}`, quartier: `Quartier ${suffix}` });
    ids.zoneId = zone.id;
    const otherZone = await saveZone({ adminUserId: ids.admin, commune: `Commune ${suffix}`, quartier: `Autre ${suffix}` });
    ids.otherZoneId = otherZone.id;

    const providerProfile = await db.insert(providerProfiles).values({ userId: ids.providerUser, displayName: "Prestataire checklist" });
    const outOfZoneProfile = await db.insert(providerProfiles).values({ userId: ids.outOfZoneUser, displayName: "Prestataire hors zone" });
    const suspendedProfile = await db.insert(providerProfiles).values({ userId: ids.suspendedUser, displayName: "Prestataire suspendu" });
    ids.providerId = insertedId(providerProfile);
    ids.outOfZoneProviderId = insertedId(outOfZoneProfile);
    ids.suspendedProviderId = insertedId(suspendedProfile);

    for (const providerId of [ids.providerId, ids.outOfZoneProviderId, ids.suspendedProviderId]) {
      await db.insert(providerServices).values({ providerId, serviceId: ids.serviceId });
    }
    await db.insert(providerZones).values({ providerId: ids.providerId, zoneId: ids.zoneId });
    await db.insert(providerZones).values({ providerId: ids.outOfZoneProviderId, zoneId: ids.otherZoneId });
    await db.insert(providerZones).values({ providerId: ids.suspendedProviderId, zoneId: ids.zoneId });

    await reviewProvider({ adminUserId: ids.admin, providerId: ids.providerId, status: "verified", note: "Vérifié pour la checklist" });
    await reviewProvider({ adminUserId: ids.admin, providerId: ids.outOfZoneProviderId, status: "verified", note: "Vérifié pour la checklist" });
    await reviewProvider({ adminUserId: ids.admin, providerId: ids.suspendedProviderId, status: "verified", note: "Vérifié puis suspendu" });

    const baseRequest = {
      customerId: ids.customer,
      serviceId: ids.serviceId,
      commune: `Commune ${suffix}`,
      quartier: `Quartier ${suffix}`,
    };
    const assignRequest = await db.insert(serviceRequests).values({ ...baseRequest, reference: `${suffix}-ASSIGN`, description: "Demande pour affectation", status: "REQUESTED", idempotencyKey: `${suffix}-assign` });
    const guardRequest = await db.insert(serviceRequests).values({ ...baseRequest, reference: `${suffix}-GUARD`, description: "Demande pour contrôle des gardes", status: "REQUESTED", idempotencyKey: `${suffix}-guard` });
    const suspendRequest = await db.insert(serviceRequests).values({ ...baseRequest, reference: `${suffix}-SUSPEND`, description: "Demande pour prestataire suspendu", status: "REQUESTED", idempotencyKey: `${suffix}-suspend` });
    const complaintRequest = await db.insert(serviceRequests).values({ ...baseRequest, reference: `${suffix}-CLAIM`, description: "Demande pour réclamation", assignedProviderId: ids.providerId, status: "COMPLETED", idempotencyKey: `${suffix}-claim` });
    const refundRequest = await db.insert(serviceRequests).values({ ...baseRequest, reference: `${suffix}-REFUND`, description: "Demande pour remboursement", assignedProviderId: ids.providerId, status: "COMPLETED", idempotencyKey: `${suffix}-refund` });
    ids.assignRequestId = insertedId(assignRequest);
    ids.guardRequestId = insertedId(guardRequest);
    ids.suspendRequestId = insertedId(suspendRequest);
    ids.complaintRequestId = insertedId(complaintRequest);
    ids.refundRequestId = insertedId(refundRequest);

    const payment = await db.insert(payments).values({ requestId: ids.refundRequestId, payerUserId: ids.customer, amountXof: "30000.00", method: "cash", status: "confirmed", commissionRateBps: 1500, commissionXof: "4500.00", providerNetXof: "25500.00", idempotencyKey: `${suffix}-payment` });
    ids.paymentId = insertedId(payment);
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;
    const requestIds = [ids.assignRequestId, ids.guardRequestId, ids.suspendRequestId, ids.complaintRequestId, ids.refundRequestId].filter(Boolean);
    const userIds = [ids.admin, ids.customer, ids.providerUser, ids.outOfZoneUser, ids.suspendedUser].filter(Boolean);
    await db.delete(complaints).where(eq(complaints.customerId, ids.customer));
    if (requestIds.length > 0) {
      await db.delete(refunds).where(inArray(refunds.requestId, requestIds));
      await db.delete(payments).where(inArray(payments.requestId, requestIds));
      await db.delete(missionResponses).where(inArray(missionResponses.requestId, requestIds));
      await db.delete(requestStatusHistory).where(inArray(requestStatusHistory.requestId, requestIds));
      await db.delete(serviceRequests).where(inArray(serviceRequests.id, requestIds));
    }
    if (userIds.length > 0) await db.delete(notifications).where(inArray(notifications.userId, userIds));
    await db.delete(adminAuditLogs).where(eq(adminAuditLogs.adminUserId, ids.admin));
    await db.delete(providerServices).where(inArray(providerServices.providerId, [ids.providerId, ids.outOfZoneProviderId, ids.suspendedProviderId].filter(Boolean)));
    await db.delete(providerZones).where(inArray(providerZones.providerId, [ids.providerId, ids.outOfZoneProviderId, ids.suspendedProviderId].filter(Boolean)));
    await db.delete(providerProfiles).where(inArray(providerProfiles.id, [ids.providerId, ids.outOfZoneProviderId, ids.suspendedProviderId].filter(Boolean)));
    await db.delete(services).where(eq(services.id, ids.serviceId));
    await db.delete(zones).where(inArray(zones.id, [ids.zoneId, ids.otherZoneId].filter(Boolean)));
    await db.delete(categories).where(eq(categories.id, ids.categoryId));
    if (userIds.length > 0) await db.delete(users).where(inArray(users.id, userIds));
  });

  it("creates catalog entries and refuses a fixed price when a diagnostic is mandatory", async () => {
    await expect(
      saveService({
        adminUserId: ids.admin,
        categoryId: ids.categoryId,
        slug: `${suffix}-bad`,
        name: "Prestation invalide",
        description: "Cette prestation ne doit pas être enregistrée.",
        pricingMode: "fixed",
        fixedPriceXof: 5000,
        diagnosticRequired: true,
      }),
    ).rejects.toThrow();

    const updatedZone = await saveZone({ adminUserId: ids.admin, id: ids.zoneId, commune: `Commune ${suffix}`, quartier: `Quartier ${suffix}`, active: false });
    expect(updatedZone.active).toBe(false);
    const reactivated = await saveZone({ adminUserId: ids.admin, id: ids.zoneId, commune: `Commune ${suffix}`, quartier: `Quartier ${suffix}`, active: true });
    expect(reactivated.active).toBe(true);
  });

  it("assigns only verified providers covering the request zone and service", async () => {
    const assignable = await listAssignableProviders(ids.assignRequestId);
    expect(assignable.some((provider) => provider.id === ids.providerId)).toBe(true);
    expect(assignable.some((provider) => provider.id === ids.outOfZoneProviderId)).toBe(false);

    await expect(assignRequestToProvider({ adminUserId: ids.admin, requestId: ids.assignRequestId, providerId: ids.outOfZoneProviderId })).rejects.toThrow();
    await reviewProvider({ adminUserId: ids.admin, providerId: ids.suspendedProviderId, status: "suspended", note: "Contrôle de garde" });
    await expect(assignRequestToProvider({ adminUserId: ids.admin, requestId: ids.assignRequestId, providerId: ids.suspendedProviderId })).rejects.toThrow();

    const assigned = await assignRequestToProvider({ adminUserId: ids.admin, requestId: ids.assignRequestId, providerId: ids.providerId });
    expect(assigned.status).toBe("ASSIGNED");
  });

  it("refuses a mission response from a suspended provider", async () => {
    await reviewProvider({ adminUserId: ids.admin, providerId: ids.providerId, status: "suspended", note: "Contrôle de garde" });
    await expect(
      respondToMission({ userId: ids.providerUser, requestId: ids.guardRequestId, decision: "accepted", idempotencyKey: `${suffix}-guard-response` }),
    ).rejects.toThrow();
    await reviewProvider({ adminUserId: ids.admin, providerId: ids.providerId, status: "verified", note: "Réactivation pour la checklist" });
  });

  it("refuses a second active complaint and restores the previous request status", async () => {
    const complaint = await createComplaint({ userId: ids.customer, requestId: ids.complaintRequestId, subject: "Réclamation checklist", description: "Description de la réclamation de checklist." });
    await expect(
      createComplaint({ userId: ids.customer, requestId: ids.complaintRequestId, subject: "Deuxième réclamation", description: "Cette seconde réclamation doit être refusée." }),
    ).rejects.toThrow();
    await resolveComplaint({ adminUserId: ids.admin, complaintId: complaint.id, status: "resolved", resolutionNote: "Résolution checklist" });
    const db = await getDb();
    if (!db) throw new Error("Test database unavailable");
    const restored = await db.select().from(serviceRequests).where(eq(serviceRequests.id, ids.complaintRequestId)).limit(1);
    expect(restored[0]?.status).toBe("COMPLETED");
  });

  it("restores the previous status when a refund is rejected", async () => {
    const refund = await createRefund({ adminUserId: ids.admin, paymentId: ids.paymentId, reason: "Remboursement refusé de checklist" });
    const rejected = await processRefund({ adminUserId: ids.admin, refundId: refund.id, status: "rejected", note: "Refus checklist" });
    expect(rejected.status).toBe("rejected");
    const db = await getDb();
    if (!db) throw new Error("Test database unavailable");
    const restored = await db.select().from(serviceRequests).where(eq(serviceRequests.id, ids.refundRequestId)).limit(1);
    expect(restored[0]?.status).toBe("COMPLETED");
    const payment = await db.select().from(payments).where(eq(payments.id, ids.paymentId)).limit(1);
    expect(payment[0]?.status).toBe("confirmed");
    await expect(processRefund({ adminUserId: ids.admin, refundId: refund.id, status: "completed" })).rejects.toThrow();
  });
});
