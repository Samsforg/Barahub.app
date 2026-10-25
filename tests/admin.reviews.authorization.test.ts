import { describe, expect, it } from "vitest";

import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

function contextFor(role: "user" | "admin"): TrpcContext {
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

describe("admin review procedures", () => {
  it("refuses review access to a regular user", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.admin.reviews()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses moderation mutations to a regular user", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.admin.moderateReview({ reviewId: 1, status: "hidden" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
