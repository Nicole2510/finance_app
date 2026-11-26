import { Router } from "express";
import { z } from "zod";
import {
  Prisma,
  type Account,
  type Category,
  type IncomeSource,
  type Transaction,
} from "@prisma/client";
import { prisma } from "../db.js";
import { requireUser } from "../middleware/requireUser.js";
import { HttpError } from "../lib/httpError.js";
import { dateSchema, moneySchema, parseBody } from "../lib/validation.js";
import { monthRange, monthSchema } from "../lib/months.js";

// Income and expenses. Transfers arrive in M5.
export const transactionsRouter = Router();
transactionsRouter.use(requireUser);

// Validate transaction details before saving, ensuring positive amounts and optional notes.
export const createSchema = z.strictObject({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: moneySchema.refine((value) => Number(value) > 0, "amount must be above zero"),
  date: dateSchema,
  accountId: z.uuid(),
  categoryId: z.uuid(),
  incomeSourceId: z.uuid().nullish(),
  notes: z.string().trim().max(200, "notes must be at most 200 characters").nullish(),
});

// Edits: any of the same fields; incomeSourceId: null removes the source
const updateSchema = createSchema.partial();

const listSchema = z
  .object({
    limit: z.coerce
      .number()
      .int("Limit must be a whole number")
      .min(1, "Limit must be at least 1")
      .max(50, "Limit cannot exceed 50")
      .optional(),
    month: monthSchema.optional(),
    accountId: z.uuid().optional(),
    categoryId: z.uuid().optional(),
    // A date range (both days included), across months. Used instead of month.
    from: dateSchema.optional(),
    to: dateSchema.optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, "The start date must be before the end date");

// Related records each transaction is sent with, so the UI can show their names
const related = {
  account: { select: { id: true, name: true } },
  category: { select: { id: true, name: true, emoji: true, group: true } },
  incomeSource: { select: { id: true, name: true } },
} satisfies Prisma.TransactionInclude;

type TransactionWithRelated = Prisma.TransactionGetPayload<{ include: typeof related }>;

// Money and dates go out as strings so they stay exact
function toJson(t: TransactionWithRelated) {
  return {
    id: t.id,
    type: t.type,
    amount: t.amount.toFixed(2),
    date: t.date.toISOString().slice(0, 10),
    notes: t.notes,
    account: t.account,
    category: t.category,
    incomeSource: t.incomeSource,
  };
}

export type References = Pick<
  z.infer<typeof createSchema>,
  "type" | "date" | "accountId" | "categoryId" | "incomeSourceId"
>;

type Kept = Pick<Transaction, "accountId" | "categoryId" | "incomeSourceId">;

type Found = {
  account: Account | null;
  category: Category | null;
  source: IncomeSource | null;
};

// The rules a transaction's account, category and income source must follow.
// Returns what's wrong, or null if it's fine. Kept apart from loading so the
// importer can check thousands of rows against records it loaded once.
// When editing, `kept` is the transaction as it was: records it already used
// may have been archived since, and that's fine, so old transactions stay editable.
export function checkReferences(data: References, found: Found, kept?: Kept): string | null {
  const usable = <T extends { id: string; archivedAt: Date | null }>(
    record: T | null,
    keptId: string | null | undefined,
  ) => (record && (record.archivedAt === null || record.id === keptId) ? record : null);

  const account = usable(found.account, kept?.accountId);
  const category = usable(found.category, kept?.categoryId);
  const source = usable(found.source, kept?.incomeSourceId);

  if (!account) return "Choose an active account";
  if (!category) return "Choose an active category";

  if ((data.type === "INCOME") !== (category.group === "INCOME")) {
    return "That category doesn't match this type of transaction";
  }

  if (data.incomeSourceId) {
    if (data.type !== "INCOME") return "Only income can have an income source";
    if (!source) return "Choose an active income source";
  }

  // Dates before the account's opening date are allowed: they're kept as
  // history (in that month's lists and totals) but don't change the balance,
  // which already includes them through the opening balance
  return null;
}

// Loads what a transaction points to (only this user's records, so someone
// else's gets the same message as a missing one), then checks the rules
async function assertValidReferences(userId: string, data: References, kept?: Kept) {
  const [account, category, source] = await Promise.all([
    prisma.account.findFirst({ where: { id: data.accountId, userId } }),
    prisma.category.findFirst({ where: { id: data.categoryId, userId } }),
    data.incomeSourceId
      ? prisma.incomeSource.findFirst({ where: { id: data.incomeSourceId, userId } })
      : null,
  ]);

  const problem = checkReferences(data, { account, category, source }, kept);
  if (problem) throw new HttpError(400, problem);
}

// Marks accounts as updated now. Called alongside every change to their
// transactions, so an account's "updated" time reflects its latest activity.
export function touchAccounts(userId: string, accountIds: string[]) {
  return prisma.account.updateMany({
    where: { id: { in: accountIds }, userId },
    data: { updatedAt: new Date() },
  });
}

// GET /api/transactions?month=2026-10&accountId=...&categoryId=...
transactionsRouter.get("/", async (req, res) => {
  const { month, accountId, categoryId, limit, from, to } = parseBody(listSchema, req.query);
  // "YYYY-MM-DD" strings compare like dates, and the column holds days only
  const range =
    from || to
      ? { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) }
      : month
        ? monthRange(month)
        : undefined;

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: req.user!.id,
      ...(range ? { date: range } : {}),
      ...(accountId ? { accountId } : {}),
      ...(categoryId ? { categoryId } : {}),
    },
    include: related,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: limit, // undefined means no limit
  });

  res.json(transactions.map(toJson));
});

transactionsRouter.post("/", async (req, res) => {
  const userId = req.user!.id;
  const data = parseBody(createSchema, req.body);
  await assertValidReferences(userId, data);

  // Both happen or neither does
  const [transaction] = await prisma.$transaction([
    prisma.transaction.create({
      data: { ...data, date: new Date(data.date), userId },
      include: related,
    }),
    touchAccounts(userId, [data.accountId]),
  ]);
  res.status(201).json(toJson(transaction));
});

const bulkDeleteSchema = z.strictObject({
  ids: z
    .array(z.uuid())
    .min(1, "Choose at least one transaction")
    .max(500, "Delete at most 500 transactions at a time"),
});

// POST /api/transactions/bulk-delete  { ids: [...] }
// Deletes several transactions together, or none: if any id isn't one of this
// user's transactions, nothing is deleted (and it's a 404, like a single delete)
transactionsRouter.post("/bulk-delete", async (req, res) => {
  const userId = req.user!.id;
  const ids = [...new Set(parseBody(bulkDeleteSchema, req.body).ids)];

  const owned = await prisma.transaction.findMany({
    where: { id: { in: ids }, userId },
    select: { accountId: true },
  });
  if (owned.length !== ids.length)
    throw new HttpError(404, "Some of those transactions weren't found");

  const [deleted] = await prisma.$transaction([
    prisma.transaction.deleteMany({ where: { id: { in: ids }, userId } }),
    touchAccounts(userId, [...new Set(owned.map((t) => t.accountId))]),
  ]);
  res.json({ deleted: deleted.count });
});

// Finds a transaction only if it belongs to this user; otherwise 404
async function findOwned(userId: string, id: string) {
  const transaction = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!transaction) throw new HttpError(404, "Transaction not found");
  return transaction;
}

transactionsRouter.patch("/:id", async (req, res) => {
  const userId = req.user!.id;
  const existing = await findOwned(userId, req.params.id);
  const changes = parseBody(updateSchema, req.body);
  if (existing.type === "ADJUSTMENT") {
    throw new HttpError(400, "Adjustments can't be edited. Delete it and reconcile again.");
  }
  if (existing.type === "TRANSFER") throw new HttpError(400, "Transfers can't be edited yet");

  // Check the transaction as it would be after the change, not just the new
  // fields: e.g. switching to income also needs an income category
  await assertValidReferences(
    userId,
    {
      type: changes.type ?? existing.type,
      date: changes.date ?? existing.date.toISOString().slice(0, 10),
      accountId: changes.accountId ?? existing.accountId,
      // Income and expenses always have a category (the database enforces it)
      categoryId: changes.categoryId ?? existing.categoryId!,
      incomeSourceId:
        changes.incomeSourceId === undefined ? existing.incomeSourceId : changes.incomeSourceId,
    },
    existing,
  );

  // Moving it to another account counts as activity on both
  const [transaction] = await prisma.$transaction([
    prisma.transaction.update({
      where: { id: existing.id },
      data: { ...changes, ...(changes.date ? { date: new Date(changes.date) } : {}) },
      include: related,
    }),
    touchAccounts(userId, [existing.accountId, changes.accountId ?? existing.accountId]),
  ]);
  res.json(toJson(transaction));
});

// Delete a transaction
transactionsRouter.delete("/:id", async (req, res) => {
  // Find the transaction, or 404 if it doesn't belong to this user
  const transaction = await findOwned(req.user!.id, req.params.id);

  // Delete the transaction from the database
  await prisma.$transaction([
    prisma.transaction.delete({ where: { id: transaction.id } }),
    touchAccounts(req.user!.id, [transaction.accountId]),
  ]);

  // Respond with 204 No Content to indicate successful deletion
  res.status(204).end();
});
