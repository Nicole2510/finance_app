import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { requireUser } from "../middleware/requireUser.js";
import { HttpError } from "../lib/httpError.js";
import { dateSchema, moneySchema, parseBody } from "../lib/validation.js";

// Income and expenses. Transfers arrive in M5.
export const transactionsRouter = Router();
transactionsRouter.use(requireUser);

// Validate transaction details before saving, ensuring positive amounts and optional notes.
const createSchema = z.strictObject({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: moneySchema.refine((value) => Number(value) > 0, "amount must be above zero"),
  date: dateSchema,
  accountId: z.uuid(),
  categoryId: z.uuid(),
  incomeSourceId: z.uuid().nullish(),
  notes: z.string().trim().max(200, "notes must be at most 200 characters").nullish(),
});

const listSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must look like 2026-10")
    .optional(),
  accountId: z.uuid().optional(),
  categoryId: z.uuid().optional(),
});

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

// The first day of a month, and of the month after: "2026-12" → Dec 1, Jan 1
function monthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    gte: new Date(Date.UTC(year, monthNumber - 1, 1)),
    lt: new Date(Date.UTC(year, monthNumber, 1)),
  };
}

type References = Pick<
  z.infer<typeof createSchema>,
  "type" | "date" | "accountId" | "categoryId" | "incomeSourceId"
>;

// Checks that everything a transaction points to belongs to this user, is still
// active, and fits together. Someone else's record gets the same message as a
// missing one, so this can't be used to discover what other users have.
async function assertValidReferences(userId: string, data: References) {
  const [account, category, source] = await Promise.all([
    prisma.account.findFirst({ where: { id: data.accountId, userId, archivedAt: null } }),
    prisma.category.findFirst({ where: { id: data.categoryId, userId, archivedAt: null } }),
    data.incomeSourceId
      ? prisma.incomeSource.findFirst({
          where: { id: data.incomeSourceId, userId, archivedAt: null },
        })
      : null,
  ]);

  if (!account) throw new HttpError(400, "Choose an active account");
  if (!category) throw new HttpError(400, "Choose an active category");

  if ((data.type === "INCOME") !== (category.group === "INCOME")) {
    throw new HttpError(400, "That category doesn't match this type of transaction");
  }

  if (data.incomeSourceId) {
    if (data.type !== "INCOME") {
      throw new HttpError(400, "Only income can have an income source");
    }
    if (!source) throw new HttpError(400, "Choose an active income source");
  }

  // Earlier days are already included in the opening balance
  if (new Date(data.date) < account.openingDate) {
    throw new HttpError(400, "The date can't be before the account's opening date");
  }
}

// GET /api/transactions?month=2026-10&accountId=...&categoryId=...
transactionsRouter.get("/", async (req, res) => {
  const { month, accountId, categoryId } = parseBody(listSchema, req.query);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: req.user!.id,
      ...(month ? { date: monthRange(month) } : {}),
      ...(accountId ? { accountId } : {}),
      ...(categoryId ? { categoryId } : {}),
    },
    include: related,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  res.json(transactions.map(toJson));
});

transactionsRouter.post("/", async (req, res) => {
  const userId = req.user!.id;
  const data = parseBody(createSchema, req.body);
  await assertValidReferences(userId, data);

  const transaction = await prisma.transaction.create({
    data: { ...data, date: new Date(data.date), userId },
    include: related,
  });
  res.status(201).json(toJson(transaction));
});
