import { Prisma } from "@prisma/client";

// A "fingerprint" for spotting duplicate transactions: two transactions with
// the same account, date, type, amount and category give the same string.
//
//   duplicateKey({ accountId: "a1", date: "2026-10-18", type: "EXPENSE",
//                  amount: "62.14", categoryId: "c1" })
//   → "a1|2026-10-18|EXPENSE|62.14|c1"
//
// The amount is written with exactly 2 decimals, so "12", "12.0" and "12.00"
// all match.
export type Fingerprintable = {
  accountId: string;
  date: string; // "YYYY-MM-DD"
  type: string;
  amount: string;
  categoryId: string | null;
};

export function duplicateKey(t: Fingerprintable): string {
  const amount = new Prisma.Decimal(t.amount).toFixed(2);
  return [t.accountId, t.date, t.type, amount, t.categoryId ?? ""].join("|");
}
