import { Prisma } from "@prisma/client";

// How big an adjustment is needed to reach the real balance:
//   adjustment = actual balance − current balance, exactly to the cent
//
//   adjustmentAmount(937.86, "950.26")  → 12.40   (bank has more: add money)
//   adjustmentAmount(937.86, "934.71")  → -3.15   (bank has less: take some away)
//   adjustmentAmount(-530,   "-600.00") → -70.00  (credit card: you owe more)
//
// Done with Prisma.Decimal, not Number(): plain JavaScript numbers can't hold
// cents exactly (0.1 + 0.2 = 0.30000000000000004).
export function adjustmentAmount(current: Prisma.Decimal, actual: string): Prisma.Decimal {
  return new Prisma.Decimal(actual).minus(current);
}
