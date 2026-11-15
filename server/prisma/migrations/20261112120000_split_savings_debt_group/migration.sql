-- Split the SAVINGS_DEBT category group into SAVINGS, DEBT and INVESTMENTS.
-- Hand-written: Postgres can't remove an enum value in place, and existing
-- categories need moving into the new groups first.

CREATE TYPE "CategoryGroup_new" AS ENUM ('NEEDS', 'WANTS', 'SAVINGS', 'DEBT', 'INVESTMENTS', 'INCOME');

-- Debt categories (e.g. the default "Debt Payments") go to DEBT; everything
-- else that was SAVINGS_DEBT goes to SAVINGS. Other groups keep their value.
ALTER TABLE "Category" ALTER COLUMN "group" TYPE "CategoryGroup_new" USING (
  CASE
    WHEN "group" = 'SAVINGS_DEBT' AND "name" ILIKE '%debt%' THEN 'DEBT'
    WHEN "group" = 'SAVINGS_DEBT' THEN 'SAVINGS'
    ELSE "group"::text
  END
)::"CategoryGroup_new";

ALTER TYPE "CategoryGroup" RENAME TO "CategoryGroup_old";
ALTER TYPE "CategoryGroup_new" RENAME TO "CategoryGroup";
DROP TYPE "CategoryGroup_old";
