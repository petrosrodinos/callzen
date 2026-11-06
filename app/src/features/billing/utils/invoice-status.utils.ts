import type { BillingInvoice } from "../interfaces/billing.interfaces";

// Refunded and failed are derived for display: Stripe keeps "paid" / "open" on the invoice itself.
export const invoiceDisplayStatus = (invoice: Pick<BillingInvoice, "status" | "amount_refunded_cents" | "attempt_count" | "last_error">): string => {
    if (invoice.amount_refunded_cents > 0) return "refunded";
    if (invoice.status === "open" && (invoice.attempt_count > 0 || invoice.last_error)) return "failed";
    return invoice.status;
};
