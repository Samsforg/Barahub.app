import { describe, expect, it } from "vitest";

import { parseSessionClaims } from "../server/_core/sessionClaims";

const APP_ID = "barahub-test-app";
const validPayload = {
  openId: "user-1",
  appId: APP_ID,
  name: "Awa",
};

describe("session claims", () => {
  it("accepts a token issued for the configured application", () => {
    expect(parseSessionClaims(validPayload, APP_ID)).toEqual(validPayload);
  });

  it("accepts an empty name because it is not an authorization field", () => {
    expect(parseSessionClaims({ ...validPayload, name: "" }, APP_ID)).toEqual({
      ...validPayload,
      name: "",
    });
  });

  it("rejects a token issued for another application", () => {
    expect(parseSessionClaims({ ...validPayload, appId: "another-app" }, APP_ID)).toBeNull();
  });

  it("rejects verification when the server application id is missing", () => {
    expect(parseSessionClaims(validPayload, "")).toBeNull();
  });

  it.each([
    { name: "empty openId", payload: { ...validPayload, openId: "" } },
    { name: "missing openId", payload: { ...validPayload, openId: undefined } },
    { name: "empty appId", payload: { ...validPayload, appId: "" } },
    { name: "missing appId", payload: { ...validPayload, appId: undefined } },
    { name: "non-string name", payload: { ...validPayload, name: 42 } },
    { name: "missing name", payload: { ...validPayload, name: undefined } },
  ])("rejects a token with $name", ({ payload }) => {
    expect(parseSessionClaims(payload, APP_ID)).toBeNull();
  });
});
