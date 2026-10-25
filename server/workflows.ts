export const COMPLAINT_ELIGIBLE_STATUSES = [
  "ASSIGNED",
  "ACCEPTED",
  "QUOTE_PENDING",
  "QUOTE_ACCEPTED",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "REVIEWED",
] as const;

export const COMPLAINT_ACTIVE_STATUSES = ["open", "in_progress"] as const;
export const COMPLAINT_CLOSED_STATUSES = ["resolved", "dismissed"] as const;
export const REFUND_REQUEST_STATUSES = ["QUOTE_ACCEPTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "REVIEWED", "CLAIM_OPEN"] as const;

const COMPLAINT_TRANSITIONS: Record<string, readonly string[]> = {
  open: ["in_progress", "resolved", "dismissed"],
  in_progress: ["resolved", "dismissed"],
};

const REFUND_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ["completed", "rejected"],
};

export type ComplaintStatus = "open" | "in_progress" | "resolved" | "dismissed";
export type RefundStatus = "pending" | "completed" | "rejected";

export function isComplaintEligibleStatus(status: string) {
  return (COMPLAINT_ELIGIBLE_STATUSES as readonly string[]).includes(status);
}

export function canTransitionComplaint(from: string, to: string) {
  return (COMPLAINT_TRANSITIONS[from] ?? []).includes(to);
}

export function canTransitionRefund(from: string, to: string) {
  return (REFUND_TRANSITIONS[from] ?? []).includes(to);
}

export function canRefundPaymentStatus(status: string) {
  return status === "confirmed";
}

export function canCreateRefundForRequestStatus(status: string) {
  return (REFUND_REQUEST_STATUSES as readonly string[]).includes(status);
}

export function isActiveComplaintStatus(status: string) {
  return (COMPLAINT_ACTIVE_STATUSES as readonly string[]).includes(status);
}

export function isClosedComplaintStatus(status: string) {
  return (COMPLAINT_CLOSED_STATUSES as readonly string[]).includes(status);
}

export function validateServicePricingInput(input: {
  pricingMode: "fixed" | "quote";
  fixedPriceXof?: number | null;
  diagnosticRequired: boolean;
}) {
  if (input.diagnosticRequired && input.pricingMode === "fixed") {
    throw new Error("Un diagnostic obligatoire ne peut pas être proposé à prix fixe");
  }
  if (input.pricingMode === "fixed") {
    if (!Number.isInteger(input.fixedPriceXof) || (input.fixedPriceXof ?? 0) <= 0) {
      throw new Error("Un prix fixe positif en FCFA est requis");
    }
  }
  if (input.pricingMode === "quote" && input.fixedPriceXof) {
    throw new Error("Une prestation sur devis ne doit pas exposer de prix fixe");
  }
}

export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

export function refundRestoreStatus(input: { previousRequestStatus?: string | null; fallback: string }) {
  const previous = input.previousRequestStatus;
  if (previous && previous !== "REFUND_PENDING" && previous !== "REFUNDED") return previous;
  return input.fallback;
}
