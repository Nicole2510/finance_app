-- Budget plans: net pay and the 50/30/20 split, starting from a month.

-- CreateTable
CREATE TABLE "BudgetPlan" (
    "id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "netPay" DECIMAL(12,2) NOT NULL,
    "needsPct" INTEGER NOT NULL DEFAULT 50,
    "wantsPct" INTEGER NOT NULL DEFAULT 30,
    "savingsPct" INTEGER NOT NULL DEFAULT 20,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BudgetPlan_userId_month_key" ON "BudgetPlan"("userId", "month");

-- AddForeignKey
ALTER TABLE "BudgetPlan" ADD CONSTRAINT "BudgetPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Hand-written: Prisma can't express CHECK constraints in the schema.

-- Take-home pay is a positive amount
ALTER TABLE "BudgetPlan" ADD CONSTRAINT "BudgetPlan_netPay_positive" CHECK ("netPay" > 0);

-- Each share is 0–100%, and together they cover all of it
ALTER TABLE "BudgetPlan" ADD CONSTRAINT "BudgetPlan_percentages_valid" CHECK (
  "needsPct" BETWEEN 0 AND 100
  AND "wantsPct" BETWEEN 0 AND 100
  AND "savingsPct" BETWEEN 0 AND 100
  AND "needsPct" + "wantsPct" + "savingsPct" = 100
);

-- A plan starts on the 1st of a month
ALTER TABLE "BudgetPlan" ADD CONSTRAINT "BudgetPlan_month_first_day" CHECK (EXTRACT(DAY FROM "month") = 1);
