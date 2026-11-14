import { describe, expect, it } from "vitest";
import type { PeriodPurchase } from "../models/PeriodPurchase.interface";
import { getOverduePurchases } from "../utils/getOverduePurchases";

// Domingo 18 de octubre de 2026, 15:00 en Costa Rica (el reloj de E2E.md).
const NOW = new Date("2026-10-18T21:00:00Z");

const buildPurchase = (
  id: string,
  closedAt: string,
  totalAmount: PeriodPurchase["totalAmount"] = null,
): PeriodPurchase => ({
  closedAt,
  id,
  storeName: "Walmart",
  totalAmount,
});

describe("getOverduePurchases (SCRUM-92, D23)", () => {
  it("does not count a purchase closed 23 h 59 min ago", () => {
    expect(getOverduePurchases([buildPurchase("a", "2026-10-17T21:01:00Z")], NOW)).toEqual([]);
  });

  it("counts a purchase closed exactly 24 hours ago (rule 63)", () => {
    expect(getOverduePurchases([buildPurchase("a", "2026-10-17T21:00:00Z")], NOW).map(({ id }) => id)).toEqual(["a"]);
  });

  it("counts purchases of any date, also from previous months (D25)", () => {
    const purchases = [buildPurchase("days", "2026-10-14T16:00:00Z"), buildPurchase("month", "2026-09-20T16:00:00Z")];

    expect(getOverduePurchases(purchases, NOW).map(({ id }) => id)).toEqual(["days", "month"]);
  });

  it("keeps only the overdue ones, in the order received", () => {
    const purchases = [
      buildPurchase("recent", "2026-10-18T10:00:00Z"),
      buildPurchase("old", "2026-10-14T16:00:00Z"),
      buildPurchase("older", "2026-09-20T16:00:00Z"),
    ];

    expect(getOverduePurchases(purchases, NOW).map(({ id }) => id)).toEqual(["old", "older"]);
  });

  it("gives nothing without purchases", () => {
    expect(getOverduePurchases([], NOW)).toEqual([]);
  });

  it("never counts a purchase with a total, also a real ₡0 (D8)", () => {
    const purchases = [buildPurchase("zero", "2026-10-14T16:00:00Z", 0), buildPurchase("paid", "2026-10-14T16:00:00Z", 5000)];

    expect(getOverduePurchases(purchases, NOW)).toEqual([]);
  });

  it("does not depend on the time zone: the same instant gives the same result", () => {
    const sameInstant = [buildPurchase("a", "2026-10-17T15:00:00-06:00")];

    expect(getOverduePurchases(sameInstant, NOW).map(({ id }) => id)).toEqual(["a"]);
  });
});
