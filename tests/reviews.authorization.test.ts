import { describe, expect, it } from "vitest";

import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

function createUnauthenticatedContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createAuthenticatedContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "sample-user",
      email: "sample@example.com",
      name: "Sample User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("reviews.create", () => {
  it("refuses an anonymous review submission", async () => {
    const caller = appRouter.createCaller(createUnauthenticatedContext());
    await expect(caller.reviews.create({ requestId: 1, rating: 5, comment: "Très bien" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a rating outside the 1-to-5 range before database access", async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext());
    await expect(caller.reviews.create({ requestId: 1, rating: 6, comment: "Invalide" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
