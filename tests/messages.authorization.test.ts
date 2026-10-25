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

describe("message procedures", () => {
  it("refuses conversation reads without a session", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.messages.list({ requestId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("refuses message sends without a session", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.messages.send({ requestId: 1, body: "Bonjour", idempotencyKey: "message-auth-test-1" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("refuses marking a conversation read without a session", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.messages.markRead({ requestId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
