import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";

import {
  adminAuditLogs,
  categories,
  complaints,
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
import { assignRequestToProvider, createComplaint, createRefund, getDb, listCustomerComplaints, processRefund, resolveComplaint, reviewProvider } from "../server/db";

const testDatabaseUrl = process.env.BARAHUB_TEST_DATABASE_URL;
const suite = testDatabaseUrl ? describe : describe.skip;

function insertedId(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  return Number((header as { insertId?: number } | null | undefined)?.insertId);
}
const suffix = `pilot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

suite("pilot multi-account workflows (persisted)", () => {
  const ids = {
    admin: 0,
    customer: 0,
    otherCustomer: 0,
    providerUser: 0,
    providerId: 0,
    categoryId: 0,
    serviceId: 0,
    zoneId: 0,
    assignmentRequestId: 0,
    complaintRequestId: 0,
    refundRequestId: 0,
    paymentId: 0,
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    const db = await getDb();
    if (!db) throw new Error("Test database unavailable");

    const adminInsert = await db.insert(users).values({ openId: `${suffix}-admin`, name: "Admin pilote", email: `${suffix}-admin@example.com`, role: "admin" });
    const customerInsert = await db.insert(users).values({ openId: `${suffix}-customer`, name: "Client pilote", email: `${suffix}-customer@example.com`, role: "user" });
    const otherInsert = await db.insert(users).values({ openId: `${suffix}-other`, name: "Autre client", email: `${suffix}-other@example.com`, role: "user" });
    const providerInsert = await db.insert(users).values({ openId: `${suffix}-provider`, name: "Prestataire pilote", email: `${suffix}-provider@example.com`, role: "user" });
    ids.admin = insertedId(adminInsert);
    ids.customer = insertedId(customerInsert);
    ids.otherCustomer = insertedId(otherInsert);
    ids.providerUser = insertedId(providerInsert);

    const insertedCategory = await db.insert(categories).values({ slug: `${suffix}-cat`, name: "Catégorie pilote" });
    ids.categoryId = insertedId(insertedCategory);
    const insertedService = await db.insert(services).values({ categoryId: ids.categoryId, slug: `${suffix}-service`, name: "Prestation pilote", description: "Prestation de test persisté", pricingMode: "quote", diagnosticRequired: false });
    ids.serviceId = insertedId(insertedService);
    const insertedZone = await db.insert(zones).values({ commune: `Commune ${suffix}`, quartier: `Quartier ${suffix}` });
    ids.zoneId = insertedId(insertedZone);

    const insertedProvider = await db.insert(providerProfiles).values({ userId: ids.providerUser, displayName: "Prestataire pilote" });
    ids.providerId = insertedId(insertedProvider);
    await db.insert(providerServices).values({ providerId: ids.providerId, serviceId: ids.serviceId });
    await db.insert(providerZones).values({ providerId: ids.providerId, zoneId: ids.zoneId });

    await reviewProvider({ adminUserId: ids.admin, providerId: ids.providerId, status: "verified", note: "Vérification de test" });

    const assignmentInsert = await db.insert(serviceRequests).values({ reference: `${suffix}-ASSIGN`, customerId: ids.customer, serviceId: ids.serviceId, description: "Demande à affecter", commune: `Commune ${suffix}`, quartier: `Quartier ${suffix}`, status: "REQUESTED", idempotencyKey: `${suffix}-assign` });
    const complaintInsert = await db.insert(serviceRequests).values({ reference: `${suffix}-CLAIM`, customerId: ids.customer, serviceId: ids.serviceId, assignedProviderId: ids.providerId, description: "Demande à réclamer", commune: `Commune ${suffix}`, quartier: `Quartier ${suffix}`, status: "COMPLETED", idempotencyKey: `${suffix}-claim` });
    const refundInsert = await db.insert(serviceRequests).values({ reference: `${suffix}-REFUND`, customerId: ids.customer, serviceId: ids.serviceId, assignedProviderId: ids.providerId, description: "Demande à rembourser", commune: `Commune ${suffix}`, quartier: `Quartier ${suffix}`, status: "COMPLETED", idempotencyKey: `${suffix}-refund` });
    ids.assignmentRequestId = insertedId(assignmentInsert);
    ids.complaintRequestId = insertedId(complaintInsert);
    ids.refundRequestId = insertedId(refundInsert);

    const insertedPayment = await db.insert(payments).values({ requestId: ids.refundRequestId, payerUserId: ids.customer, amountXof: "25000.00", method: "cash", status: "confirmed", commissionRateBps: 1500, commissionXof: "3750.00", providerNetXof: "21250.00", idempotencyKey: `${suffix}-payment` });
    ids.paymentId = insertedId(insertedPayment);
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;
    const requestIds = [ids.assignmentRequestId, ids.complaintRequestId, ids.refundRequestId].filter(Boolean);
    await db.delete(complaints).where(eq(complaints.customerId, ids.customer));
    if (requestIds.length > 0) {
      await db.delete(refunds).where(inArray(refunds.requestId, requestIds));
      await db.delete(payments).where(inArray(payments.requestId, requestIds));
      await db.delete(requestStatusHistory).where(inArray(requestStatusHistory.requestId, requestIds));
      await db.delete(serviceRequests).where(inArray(serviceRequests.id, requestIds));
    }
    await db.delete(notifications).where(inArray(notifications.userId, [ids.admin, ids.customer, ids.otherCustomer, ids.providerUser].filter(Boolean)));
    await db.delete(adminAuditLogs).where(eq(adminAuditLogs.adminUserId, ids.admin));
    await db.delete(providerServices).where(eq(providerServices.providerId, ids.providerId));
    await db.delete(providerZones).where(eq(providerZones.providerId, ids.providerId));
    await db.delete(providerProfiles).where(eq(providerProfiles.id, ids.providerId));
    await db.delete(services).where(eq(services.id, ids.serviceId));
    await db.delete(zones).where(eq(zones.id, ids.zoneId));
    await db.delete(categories).where(eq(categories.id, ids.categoryId));
    await db.delete(users).where(inArray(users.id, [ids.admin, ids.customer, ids.otherCustomer, ids.providerUser].filter(Boolean)));
  });

  it("verifies a provider and assigns a request manually", async () => {
    const db = await getDb();
    if (!db) throw new Error("Test database unavailable");
    const request = await assignRequestToProvider({ adminUserId: ids.admin, requestId: ids.assignmentRequestId, providerId: ids.providerId, note: "Affectation test" });
    expect(request.status).toBe("ASSIGNED");
    expect(request.assignedProviderId).toBe(ids.providerId);
    const saved = await db.select().from(serviceRequests).where(eq(serviceRequests.id, ids.assignmentRequestId)).limit(1);
    expect(saved[0]?.status).toBe("ASSIGNED");
  });

  it("opens a complaint without exposing it to another customer", async () => {
    const complaint = await createComplaint({ userId: ids.customer, requestId: ids.complaintRequestId, subject: "Problème de test", description: "Description persistée de la réclamation." });
    expect(complaint.status).toBe("open");
    const mine = await listCustomerComplaints(ids.customer);
    expect(mine.some((row) => row.complaint.id === complaint.id)).toBe(true);
    const other = await listCustomerComplaints(ids.otherCustomer);
    expect(other.some((row) => row.complaint.id === complaint.id)).toBe(false);
    await expect(createComplaint({ userId: ids.otherCustomer, requestId: ids.complaintRequestId, subject: "Tentative", description: "Tentative d’ouverture non autorisée." })).rejects.toThrow();
  });

  it("restores the request status when a complaint is resolved", async () => {
    const db = await getDb();
    if (!db) throw new Error("Test database unavailable");
    const [complaint] = await db.select().from(complaints).where(eq(complaints.requestId, ids.complaintRequestId)).limit(1);
    const openRequest = await db.select().from(serviceRequests).where(eq(serviceRequests.id, ids.complaintRequestId)).limit(1);
    expect(openRequest[0]?.status).toBe("CLAIM_OPEN");
    const resolved = await resolveComplaint({ adminUserId: ids.admin, complaintId: complaint.id, status: "resolved", resolutionNote: "Résolution de test" });
    expect(resolved.status).toBe("resolved");
    const restored = await db.select().from(serviceRequests).where(eq(serviceRequests.id, ids.complaintRequestId)).limit(1);
    expect(restored[0]?.status).toBe("COMPLETED");
  });

  it("creates and completes a refund once", async () => {
    const db = await getDb();
    if (!db) throw new Error("Test database unavailable");
    const refund = await createRefund({ adminUserId: ids.admin, paymentId: ids.paymentId, reason: "Remboursement de test" });
    expect(refund.status).toBe("pending");
    const pendingRequest = await db.select().from(serviceRequests).where(eq(serviceRequests.id, ids.refundRequestId)).limit(1);
    expect(pendingRequest[0]?.status).toBe("REFUND_PENDING");
    const completed = await processRefund({ adminUserId: ids.admin, refundId: refund.id, status: "completed", note: "Confirmation de test" });
    expect(completed.status).toBe("completed");
    const payment = await db.select().from(payments).where(eq(payments.id, ids.paymentId)).limit(1);
    expect(payment[0]?.status).toBe("refunded");
    const refundedRequest = await db.select().from(serviceRequests).where(eq(serviceRequests.id, ids.refundRequestId)).limit(1);
    expect(refundedRequest[0]?.status).toBe("REFUNDED");
    await expect(processRefund({ adminUserId: ids.admin, refundId: refund.id, status: "rejected" })).rejects.toThrow();
  });
});
