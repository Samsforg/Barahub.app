import { describe, expect, it } from "vitest";
import {
  assertProductionSessionSecret,
  SessionSecretError,
} from "../server/_core/sessionSecret";

const VALID_SECRET = "9f4b1d7c2e8a6f3b5c0d9e1a7b4c8f2d6e3a9c5b1f7d0e4a8c2b6f9d3e7a1c5b";

describe("production session secret", () => {
  it("does not require configuration outside production", () => {
    expect(() =>
      assertProductionSessionSecret({ secret: undefined, nodeEnv: "test" }),
    ).not.toThrow();
    expect(() =>
      assertProductionSessionSecret({ secret: "", nodeEnv: "development" }),
    ).not.toThrow();
  });

  it("accepts a sufficiently long and varied secret in production", () => {
    expect(() =>
      assertProductionSessionSecret({ secret: VALID_SECRET, nodeEnv: "production" }),
    ).not.toThrow();
  });

  it.each([
    { name: "absent", secret: undefined },
    { name: "empty", secret: "" },
    { name: "blank", secret: " ".repeat(64) },
    { name: "too short", secret: "short-secret" },
    { name: "known placeholder", secret: "changeme".repeat(4) },
    { name: "repeated characters", secret: "a".repeat(64) },
  ])("rejects a $name secret in production", ({ secret }) => {
    expect(() =>
      assertProductionSessionSecret({ secret, nodeEnv: "production" }),
    ).toThrow(SessionSecretError);
  });

  it("does not include the rejected secret in the error message", () => {
    const weakSecret = "changeme".repeat(4);

    try {
      assertProductionSessionSecret({ secret: weakSecret, nodeEnv: "production" });
      throw new Error("expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(SessionSecretError);
      expect((error as Error).message).not.toContain(weakSecret);
    }
  });
});
