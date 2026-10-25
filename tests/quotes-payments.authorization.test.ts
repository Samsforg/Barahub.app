import { describe, expect, it } from "vitest";

import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

function contextFor(role: "user" | "admin" | null): TrpcContext {
  return {
    user: role
      ? {
          id: role === "admin" ? 99 : 1,
          openId: `${role}-sample`,
          email: `${role}@example.com`,
          name: role === "admin" ? "Admin Barahub" : "Client Barahub",
          loginMethod: "manus",
          role,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        }
      : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("quote and declarative payment access", () => {
  it("refuses quote access without a session", async () => {
    const caller = appRouter.createCaller(contextFor(null));
    await expect(caller.quotes.mine({ requestId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("refuses quote emission without a session", async () => {
    const caller = appRouter.createCaller(contextFor(null));
    await expect(caller.provider.sendQuote({ requestId: 1, amountXof: 10000, travelFeeXof: 0, idempotencyKey: "quote-test-key-001" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("keeps payment reconciliation behind the admin guard", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.admin.payments()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.transitionPayment({ paymentId: 1, status: "confirmed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
