import { describe, expect, it } from "vitest";

import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

function regularUserContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "regular-user-sample",
      email: "client@example.com",
      name: "Client Barahub",
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

describe("admin analytics procedures", () => {
  it("refuses statistical reports to a regular user", async () => {
    const caller = appRouter.createCaller(regularUserContext());
    await expect(caller.admin.analytics({ days: 30 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses statistical reports without an admin session", async () => {
    const caller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(caller.admin.analytics({ days: 7 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
