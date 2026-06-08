import { describe, it, expect } from "vitest";

// Pure aggregation mirroring get_revenue_summary so unit tests can prove the
// math without a live DB. Source of truth = the SQL function in the migration.
type Ev = {
  event_type: string;
  direction: "credit" | "debit";
  amount_cents: number;
  net_cents: number;
  fee_cents: number;
  tax_cents: number;
};

function summarize(events: Ev[]) {
  return {
    gross_cents: events.reduce((s, e) => s + (e.direction === "credit" ? e.amount_cents : 0), 0),
    refund_cents: events.reduce((s, e) => s + (e.event_type.startsWith("adjustment.") && e.direction === "debit" ? e.amount_cents : 0), 0),
    chargeback_cents: events.reduce((s, e) => s + (e.event_type.includes("chargeback") ? e.amount_cents : 0), 0),
    fee_cents: events.reduce((s, e) => s + e.fee_cents, 0),
    tax_cents: events.reduce((s, e) => s + e.tax_cents, 0),
    net_cents: events.reduce((s, e) => s + (e.direction === "credit" ? e.net_cents : -e.net_cents), 0),
    event_count: events.length,
  };
}

const ev = (o: Partial<Ev>): Ev => ({
  event_type: "transaction.completed", direction: "credit",
  amount_cents: 0, net_cents: 0, fee_cents: 0, tax_cents: 0, ...o,
});

describe("Revenue summary aggregation", () => {
  it("returns zeros on empty input", () => {
    const s = summarize([]);
    expect(s).toMatchObject({ gross_cents: 0, refund_cents: 0, net_cents: 0, event_count: 0 });
  });

  it("sums gross from credit events only", () => {
    const s = summarize([
      ev({ direction: "credit", amount_cents: 1000, net_cents: 780, fee_cents: 30, tax_cents: 190 }),
      ev({ direction: "credit", amount_cents: 2000, net_cents: 1600, fee_cents: 60, tax_cents: 340 }),
      ev({ event_type: "adjustment.created", direction: "debit", amount_cents: 500, net_cents: 500 }),
    ]);
    expect(s.gross_cents).toBe(3000);
    expect(s.refund_cents).toBe(500);
    expect(s.net_cents).toBe(780 + 1600 - 500);
    expect(s.fee_cents).toBe(90);
    expect(s.tax_cents).toBe(530);
    expect(s.event_count).toBe(3);
  });

  it("classifies chargebacks separately from refunds", () => {
    const s = summarize([
      ev({ event_type: "transaction.chargeback", direction: "debit", amount_cents: 1500, net_cents: 1500 }),
    ]);
    expect(s.chargeback_cents).toBe(1500);
    expect(s.refund_cents).toBe(0);
  });
});
