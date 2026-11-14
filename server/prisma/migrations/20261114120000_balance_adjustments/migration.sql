-- Balance adjustments: a transaction type that corrects an account's balance
-- to match the bank. Its amount can be negative and it has no category.

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'ADJUSTMENT';

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "categoryId" DROP NOT NULL;

-- Hand-written: Prisma can't express CHECK constraints in the schema.
-- "type"::text is compared as text because Postgres won't let a migration use
-- a new enum value in the same transaction that adds it.

-- Amounts are positive, except adjustments, which can go either way but never be zero
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_amount_positive";
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_amount_valid" CHECK (
  CASE WHEN "type"::text = 'ADJUSTMENT' THEN "amount" <> 0 ELSE "amount" > 0 END
);

-- Income and expenses still need a category
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_category_required" CHECK (
  "type"::text NOT IN ('INCOME', 'EXPENSE') OR "categoryId" IS NOT NULL
);

-- Adjustments aren't income or spending, so no category or income source
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_adjustment_plain" CHECK (
  "type"::text <> 'ADJUSTMENT' OR ("categoryId" IS NULL AND "incomeSourceId" IS NULL)
);
