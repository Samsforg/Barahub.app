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

describe("notification procedures", () => {
  it("refuses notification reads without a session", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.notifications.mine()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("refuses notification acknowledgements without a session", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.notifications.markRead({ notificationId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
