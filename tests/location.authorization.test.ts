import { describe, expect, it } from "vitest";

import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

function anonymousContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function userContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "location-user",
      email: "location@example.com",
      name: "Location User",
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

describe("location procedures", () => {
  it("refuses customer tracking without a session", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.requests.tracking({ requestId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("refuses provider location updates without a session", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.provider.location.update({ requestId: 1, latitude: 5.32, longitude: -4.01, sharingStatus: "shared" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects partial customer coordinates", async () => {
    const caller = appRouter.createCaller(userContext());
    await expect(caller.requests.create({ description: "Une demande suffisamment détaillée", commune: "Cocody", quartier: "Riviera", latitude: 5.34, idempotencyKey: "location-test-key-1" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
