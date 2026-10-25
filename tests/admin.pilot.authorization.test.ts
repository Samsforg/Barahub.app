import { describe, expect, it } from "vitest";

import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

function contextFor(role: "user" | "admin" | "anonymous"): TrpcContext {
  if (role === "anonymous") return { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
  return {
    user: {
      id: role === "admin" ? 99 : 1,
      openId: `${role}-sample`,
      email: `${role}@example.com`,
      name: role === "admin" ? "Admin Barahub" : "Client Barahub",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("admin pilot procedures", () => {
  const caller = () => appRouter.createCaller(contextFor("user"));

  it("refuses provider verification tools to a regular user", async () => {
    await expect(caller().admin.providers()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().admin.reviewProvider({ providerId: 1, status: "verified" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses manual assignment to a regular user", async () => {
    await expect(caller().admin.assignableProviders({ requestId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().admin.assignRequest({ requestId: 1, providerId: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses catalogue management to a regular user", async () => {
    await expect(caller().admin.categories()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().admin.saveCategory({ name: "Nouvelle catégorie" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().admin.services()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().admin.saveService({ categoryId: 1, name: "Prestation", description: "Description valide", pricingMode: "quote", diagnosticRequired: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().admin.zones()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().admin.saveZone({ commune: "Cocody", quartier: "Angré" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses complaints and refunds handling to a regular user", async () => {
    await expect(caller().admin.complaints()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().admin.resolveComplaint({ complaintId: 1, status: "resolved" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().admin.refunds()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().admin.createRefund({ paymentId: 1, reason: "Motif valide" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().admin.processRefund({ refundId: 1, status: "completed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses the old direct refund payment transition", async () => {
    await expect(caller().admin.transitionPayment({ paymentId: 1, status: "refunded" as never })).rejects.toBeTruthy();
  });
});

describe("client complaint procedures", () => {
  it("requires an authenticated customer", async () => {
    const anonymous = appRouter.createCaller(contextFor("anonymous"));
    await expect(anonymous.complaints.mine()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(anonymous.complaints.create({ requestId: 1, subject: "Sujet valide", description: "Description suffisamment longue" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
