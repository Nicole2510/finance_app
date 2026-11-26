-- Monthly budgets: how much is planned for one category in one month.

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "categoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Budget_userId_categoryId_month_key" ON "Budget"("userId", "categoryId", "month");

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Hand-written: Prisma can't express CHECK constraints in the schema.

-- A budget is always a positive amount; removing one deletes the row
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_amount_positive" CHECK ("amount" > 0);

-- A budget's month is stored as the 1st of that month
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_month_first_day" CHECK (EXTRACT(DAY FROM "month") = 1);
