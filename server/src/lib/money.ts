import { Prisma } from "@prisma/client";

// Adds money strings exactly (decimals, never floats): ["0.10", "0.20"] → "0.30"
export function sumMoney(amounts: string[]) {
  return amounts.reduce((sum, amount) => sum.plus(amount), new Prisma.Decimal(0)).toFixed(2);
}
