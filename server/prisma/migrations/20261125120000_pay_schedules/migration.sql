-- Pay schedules: what each income source pays and when, from its first payday.
-- A budget plan's net pay becomes an optional override of expected income.

-- CreateEnum
CREATE TYPE "PayFrequency" AS ENUM ('WEEKS', 'MONTHS', 'TWICE_A_MONTH');

-- AlterTable
ALTER TABLE "BudgetPlan" ALTER COLUMN "netPay" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PaySchedule" (
    "id" TEXT NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE,
    "amount" DECIMAL(12,2) NOT NULL,
    "frequency" "PayFrequency" NOT NULL,
    "interval" INTEGER,
    "dayOne" INTEGER,
    "dayTwo" INTEGER,
    "incomeSourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaySchedule_incomeSourceId_startsOn_key" ON "PaySchedule"("incomeSourceId", "startsOn");

-- AddForeignKey
ALTER TABLE "PaySchedule" ADD CONSTRAINT "PaySchedule_incomeSourceId_fkey" FOREIGN KEY ("incomeSourceId") REFERENCES "IncomeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaySchedule" ADD CONSTRAINT "PaySchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Hand-written: Prisma can't express CHECK constraints in the schema.

-- A paycheque is a positive amount
ALTER TABLE "PaySchedule" ADD CONSTRAINT "PaySchedule_amount_positive" CHECK ("amount" > 0);

-- The last payday can't come before the first
ALTER TABLE "PaySchedule" ADD CONSTRAINT "PaySchedule_ends_after_start" CHECK (
  "endsOn" IS NULL OR "endsOn" >= "startsOn"
);

-- Every N weeks (1-52) or N months (1-12) needs an interval and no days;
-- twice a month needs two different days (1-31) and no interval.
-- COALESCE(..., false): a comparison with an empty value is "unknown", which a
-- CHECK would let through, so a missing interval or day must count as invalid.
ALTER TABLE "PaySchedule" ADD CONSTRAINT "PaySchedule_frequency_valid" CHECK (
  COALESCE(CASE "frequency"::text
    WHEN 'WEEKS' THEN "interval" BETWEEN 1 AND 52 AND "dayOne" IS NULL AND "dayTwo" IS NULL
    WHEN 'MONTHS' THEN "interval" BETWEEN 1 AND 12 AND "dayOne" IS NULL AND "dayTwo" IS NULL
    ELSE "interval" IS NULL
      AND "dayOne" BETWEEN 1 AND 31
      AND "dayTwo" BETWEEN 1 AND 31
      AND "dayOne" < "dayTwo"
  END, false)
);
