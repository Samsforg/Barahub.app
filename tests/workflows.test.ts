import { describe, expect, it } from "vitest";

import {
  canCreateRefundForRequestStatus,
  canRefundPaymentStatus,
  canTransitionComplaint,
  canTransitionRefund,
  isClosedComplaintStatus,
  isComplaintEligibleStatus,
  normalizeSlug,
  refundRestoreStatus,
  validateServicePricingInput,
} from "../server/workflows";

describe("complaint workflow", () => {
  it("accepts only eligible request statuses", () => {
    expect(isComplaintEligibleStatus("COMPLETED")).toBe(true);
    expect(isComplaintEligibleStatus("IN_PROGRESS")).toBe(true);
    expect(isComplaintEligibleStatus("REQUESTED")).toBe(false);
    expect(isComplaintEligibleStatus("CLAIM_OPEN")).toBe(false);
  });

  it("only allows forward complaint transitions", () => {
    expect(canTransitionComplaint("open", "in_progress")).toBe(true);
    expect(canTransitionComplaint("open", "resolved")).toBe(true);
    expect(canTransitionComplaint("in_progress", "dismissed")).toBe(true);
    expect(canTransitionComplaint("resolved", "in_progress")).toBe(false);
    expect(canTransitionComplaint("dismissed", "resolved")).toBe(false);
  });

  it("marks resolved and dismissed as closed", () => {
    expect(isClosedComplaintStatus("resolved")).toBe(true);
    expect(isClosedComplaintStatus("dismissed")).toBe(true);
    expect(isClosedComplaintStatus("open")).toBe(false);
    expect(isClosedComplaintStatus("in_progress")).toBe(false);
  });
});

describe("refund workflow", () => {
  it("requires a confirmed payment", () => {
    expect(canRefundPaymentStatus("confirmed")).toBe(true);
    expect(canRefundPaymentStatus("declared")).toBe(false);
    expect(canRefundPaymentStatus("refunded")).toBe(false);
  });

  it("limits refundable request statuses", () => {
    expect(canCreateRefundForRequestStatus("COMPLETED")).toBe(true);
    expect(canCreateRefundForRequestStatus("QUOTE_ACCEPTED")).toBe(true);
    expect(canCreateRefundForRequestStatus("CLAIM_OPEN")).toBe(true);
    expect(canCreateRefundForRequestStatus("REQUESTED")).toBe(false);
    expect(canCreateRefundForRequestStatus("REFUNDED")).toBe(false);
  });

  it("only processes pending refunds once", () => {
    expect(canTransitionRefund("pending", "completed")).toBe(true);
    expect(canTransitionRefund("pending", "rejected")).toBe(true);
    expect(canTransitionRefund("completed", "rejected")).toBe(false);
    expect(canTransitionRefund("rejected", "completed")).toBe(false);
  });

  it("restores the previous request status on rejection", () => {
    expect(refundRestoreStatus({ previousRequestStatus: "COMPLETED", fallback: "COMPLETED" })).toBe("COMPLETED");
    expect(refundRestoreStatus({ previousRequestStatus: "REFUND_PENDING", fallback: "COMPLETED" })).toBe("COMPLETED");
    expect(refundRestoreStatus({ previousRequestStatus: null, fallback: "COMPLETED" })).toBe("COMPLETED");
  });
});

describe("service pricing rules", () => {
  it("rejects a fixed price with mandatory diagnostic", () => {
    expect(() => validateServicePricingInput({ pricingMode: "fixed", fixedPriceXof: 10000, diagnosticRequired: true })).toThrow();
  });

  it("requires a positive fixed price", () => {
    expect(() => validateServicePricingInput({ pricingMode: "fixed", fixedPriceXof: 0, diagnosticRequired: false })).toThrow();
    expect(() => validateServicePricingInput({ pricingMode: "fixed", fixedPriceXof: 5000, diagnosticRequired: false })).not.toThrow();
  });

  it("rejects a fixed price on quote pricing", () => {
    expect(() => validateServicePricingInput({ pricingMode: "quote", fixedPriceXof: 5000, diagnosticRequired: false })).toThrow();
    expect(() => validateServicePricingInput({ pricingMode: "quote", diagnosticRequired: false })).not.toThrow();
  });
});

describe("slug normalization", () => {
  it("removes accents and separators", () => {
    expect(normalizeSlug("Plomberie générale")).toBe("plomberie-generale");
    expect(normalizeSlug("  Électricité / Urgence  ")).toBe("electricite-urgence");
  });
});
