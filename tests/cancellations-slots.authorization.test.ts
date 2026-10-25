import { describe, expect, it } from "vitest";

import { appRouter } from "../server/routers";
import { appointmentWindowsOverlap, DEFAULT_APPOINTMENT_DURATION_MINUTES, getAppointmentWindow } from "../server/db";
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

describe("cancellation and appointment safety", () => {
  it("builds a one-hour appointment window by default", () => {
    const startsAt = new Date(Date.now() + 60 * 60 * 1000);
    const window = getAppointmentWindow(startsAt);
    expect(window.durationMinutes).toBe(DEFAULT_APPOINTMENT_DURATION_MINUTES);
    expect(window.endsAt.getTime() - startsAt.getTime()).toBe(60 * 60 * 1000);
  });

  it("rejects past and excessively long appointment windows", () => {
    expect(() => getAppointmentWindow(new Date(Date.now() - 1000))).toThrow("future");
    expect(() => getAppointmentWindow(new Date(Date.now() + 60 * 60 * 1000), 721)).toThrow("too long");
  });

  it("blocks overlapping windows but allows adjacent appointments", () => {
    const first = { startsAt: new Date("2030-01-01T10:00:00Z"), endsAt: new Date("2030-01-01T11:00:00Z") };
    expect(appointmentWindowsOverlap(first, { startsAt: new Date("2030-01-01T10:30:00Z"), endsAt: new Date("2030-01-01T11:30:00Z") })).toBe(true);
    expect(appointmentWindowsOverlap(first, { startsAt: new Date("2030-01-01T11:00:00Z"), endsAt: new Date("2030-01-01T12:00:00Z") })).toBe(false);
  });

  it("protects cancellation mutations behind authentication and admin guards", async () => {
    const anonymous = appRouter.createCaller(contextFor(null));
    await expect(anonymous.requests.cancel({ requestId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(anonymous.provider.cancelMission({ requestId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    const regularUser = appRouter.createCaller(contextFor("user"));
    await expect(regularUser.admin.cancelRequest({ requestId: 1, reason: "Test" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
