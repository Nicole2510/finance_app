-- Expected income now comes from pay schedules, so a budget plan holds only
-- the 50/30/20 split. Dropping the column also drops its CHECK constraint.

-- AlterTable
ALTER TABLE "BudgetPlan" DROP CONSTRAINT IF EXISTS "BudgetPlan_netPay_positive";
ALTER TABLE "BudgetPlan" DROP COLUMN "netPay";
