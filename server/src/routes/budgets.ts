import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireUser } from "../middleware/requireUser.js";
import { HttpError } from "../lib/httpError.js";
import { moneySchema, parseBody } from "../lib/validation.js";
import { lastMonths, monthRange, monthSchema, monthStart, previousMonth } from "../lib/months.js";

// Monthly budgets: a planned amount per spending category per month
export const budgetsRouter = Router();
budgetsRouter.use(requireUser);

const amountSchema = z.strictObject({
  amount: moneySchema.refine((value) => Number(value) > 0, "amount must be above zero"),
});

// A month in the URL, e.g. /api/budgets/2026-10
function monthParam(value: unknown) {
  return parseBody(monthSchema, value);
}

// One of the user's categories that can have a budget: spending, not archived.
// Another user's category is "not found", so nobody can tell it exists.
async function budgetableCategory(userId: string, categoryId: unknown) {
  const id = z.uuid().safeParse(categoryId);
  const category = id.success
    ? await prisma.category.findFirst({ where: { id: id.data, userId } })
    : null;
  if (!category) throw new HttpError(404, "Category not found");
  if (category.group === "INCOME") {
    throw new HttpError(400, "Budgets are for spending categories, not income");
  }
  if (category.archivedAt) {
    throw new HttpError(409, "Restore this category to give it a budget");
  }
  return category;
}

// Every spending category for a month, with its budget (or null) and what was
// spent. Archived categories only appear if they have a budget or spending.
budgetsRouter.get("/:month", async (req, res) => {
  const month = monthParam(req.params.month);
  const userId = req.user!.id;

  const [categories, budgets, spending] = await Promise.all([
    prisma.category.findMany({
      where: { userId, group: { not: "INCOME" } },
      orderBy: { name: "asc" },
    }),
    prisma.budget.findMany({ where: { userId, month: monthStart(month) } }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: "EXPENSE", date: monthRange(month) },
      _sum: { amount: true },
    }),
  ]);

  const budgetOf = new Map(budgets.map((b) => [b.categoryId, b.amount]));
  const spentOf = new Map(spending.map((s) => [s.categoryId, s._sum.amount]));

  res.json({
    month,
    categories: categories
      .map((c) => ({
        id: c.id,
        name: c.name,
        emoji: c.emoji,
        group: c.group,
        archived: c.archivedAt !== null,
        budget: budgetOf.get(c.id)?.toFixed(2) ?? null,
        spent: spentOf.get(c.id)?.toFixed(2) ?? "0.00",
      }))
      .filter((c) => !c.archived || c.budget !== null || c.spent !== "0.00"),
  });
});

// Total spending for each of the 6 months up to and including this one, for
// the spending chart. Only expenses count (not income or adjustments).
budgetsRouter.get("/:month/history", async (req, res) => {
  const month = monthParam(req.params.month);
  const userId = req.user!.id;

  const months = await Promise.all(
    lastMonths(month, 6).map(async (m) => {
      const { _sum } = await prisma.transaction.aggregate({
        where: { userId, type: "EXPENSE", date: monthRange(m) },
        _sum: { amount: true },
      });
      return { month: m, spent: _sum.amount?.toFixed(2) ?? "0.00" };
    }),
  );

  res.json({ months });
});

// Sets (or changes) one category's budget for a month
budgetsRouter.put("/:month/:categoryId", async (req, res) => {
  const month = monthParam(req.params.month);
  const { amount } = parseBody(amountSchema, req.body);
  const userId = req.user!.id;
  const category = await budgetableCategory(userId, req.params.categoryId);

  const budget = await prisma.budget.upsert({
    where: {
      userId_categoryId_month: { userId, categoryId: category.id, month: monthStart(month) },
    },
    create: { userId, categoryId: category.id, month: monthStart(month), amount },
    update: { amount },
  });

  res.json({ categoryId: category.id, month, amount: budget.amount.toFixed(2) });
});

// Removes one category's budget for a month (fine if there wasn't one)
budgetsRouter.delete("/:month/:categoryId", async (req, res) => {
  const month = monthParam(req.params.month);
  const userId = req.user!.id;
  const id = z.uuid().safeParse(req.params.categoryId);
  const category = id.success
    ? await prisma.category.findFirst({ where: { id: id.data, userId } })
    : null;
  if (!category) throw new HttpError(404, "Category not found");

  await prisma.budget.deleteMany({
    where: { userId, categoryId: category.id, month: monthStart(month) },
  });
  res.status(204).end();
});

// Copies last month's budgets into this month. Categories that already have a
// budget this month keep it, and archived categories are left out.
budgetsRouter.post("/:month/copy-previous", async (req, res) => {
  const month = monthParam(req.params.month);
  const userId = req.user!.id;

  const previous = await prisma.budget.findMany({
    where: {
      userId,
      month: monthStart(previousMonth(month)),
      category: { archivedAt: null, group: { not: "INCOME" } },
    },
  });

  const { count } = await prisma.budget.createMany({
    data: previous.map((b) => ({
      userId,
      categoryId: b.categoryId,
      month: monthStart(month),
      amount: b.amount,
    })),
    skipDuplicates: true, // keep budgets already set this month
  });

  res.json({ copied: count });
});
