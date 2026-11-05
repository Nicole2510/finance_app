import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

// Current balance of each of a user's accounts, calculated by the database:
//   openingBalance + income − expenses
// counting only transactions on or after the account's openingDate
// (earlier ones are already included in the opening balance).
// Transfers and debt payments get added here in M5/M6.
export async function getBalances(userId: string): Promise<Map<string, Prisma.Decimal>> {
  const rows = await prisma.$queryRaw<{ id: string; balance: Prisma.Decimal }[]>`
    SELECT a.id,
           a."openingBalance" + COALESCE(SUM(
             CASE t.type
               WHEN 'INCOME' THEN t.amount
               WHEN 'EXPENSE' THEN -t.amount
               ELSE 0
             END
           ), 0) AS balance
    FROM "Account" a
    LEFT JOIN "Transaction" t
      ON t."accountId" = a.id AND t.date >= a."openingDate"
    WHERE a."userId" = ${userId}
    GROUP BY a.id
  `;

  return new Map(rows.map((r) => [r.id, r.balance]));
}
