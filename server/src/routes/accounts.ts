import { Router } from "express";
import { z } from "zod";
import { AccountType, Prisma, type Account } from "@prisma/client";
import { prisma } from "../db.js";
import { requireUser } from "../middleware/requireUser.js";
import { getBalances } from "../lib/balances.js";
import { HttpError } from "../lib/httpError.js";
import { nameSchema, parseBody } from "../lib/validation.js";

export const accountsRouter = Router();
accountsRouter.use(requireUser);

const createSchema = z.strictObject({
  name: nameSchema,
  type: z.enum(AccountType),
  openingBalance: z.string().regex(/^-?\d{1,10}(\.\d{1,2})?$/, "must be a string of money, e.g. '2430.00'"),
  openingDate: z.string().refine((value) => {
    const date = new Date(value); // Accepts YYYY-MM-DD, creates date
    if (isNaN(date.getTime())) return false; // Invalid date
    return date.toISOString().slice(0, 10) === value;
  }, "must be a valid date in the format YYYY-MM-DD"),
});
// ───────────────────────────────────────────────────────────────────────────

// Edits: any subset of the create fields, plus archive/restore
const updateSchema = createSchema.partial().extend({ archived: z.boolean().optional() });

// Money and dates go out as strings so they stay exact: "2430.00", "2026-10-01"
function toJson(account: Account, balance: Prisma.Decimal | undefined) {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    openingBalance: account.openingBalance.toFixed(2),
    openingDate: account.openingDate.toISOString().slice(0, 10),
    currentBalance: (balance ?? account.openingBalance).toFixed(2),
    archivedAt: account.archivedAt,
    updatedAt: account.updatedAt,
  };
}

// Finds an account only if it belongs to this user; otherwise 404
async function findOwned(userId: string, id: string) {
  const account = await prisma.account.findFirst({ where: { id, userId } });
  if (!account) throw new HttpError(404, "Account not found");
  return account;
}

// GET /api/accounts?includeArchived=true
accountsRouter.get("/", async (req, res) => {
  const userId = req.user!.id;
  const [accounts, balances] = await Promise.all([
    prisma.account.findMany({
      where: {
        userId,
        ...(req.query.includeArchived === "true" ? {} : { archivedAt: null }),
      },
      orderBy: { createdAt: "asc" },
    }),
    getBalances(userId),
  ]);

  res.json(accounts.map((a) => toJson(a, balances.get(a.id))));
});

accountsRouter.post("/", async (req, res) => {
  const data = parseBody(createSchema, req.body);

  const account = await prisma.account.create({
    data: { ...data, openingDate: new Date(data.openingDate), userId: req.user!.id },
  });
  res.status(201).json(toJson(account, undefined));
});

accountsRouter.patch("/:id", async (req, res) => {
  const userId = req.user!.id;
  const account = await findOwned(userId, req.params.id);
  const { archived, openingDate, ...changes } = parseBody(updateSchema, req.body);

  // Moving the opening date later would silently drop older transactions
  // from the balance, so block it if any exist before the new date
  if (openingDate !== undefined) {
    const earlier = await prisma.transaction.count({
      where: { accountId: account.id, date: { lt: new Date(openingDate) } },
    });
    if (earlier > 0) {
      throw new HttpError(
        409,
        "This account has transactions before that date. Choose an earlier opening date.",
      );
    }
  }

  const updated = await prisma.account.update({
    where: { id: account.id },
    data: {
      ...changes,
      ...(openingDate === undefined ? {} : { openingDate: new Date(openingDate) }),
      ...(archived === undefined ? {} : { archivedAt: archived ? new Date() : null }),
    },
  });
  const balances = await getBalances(userId);
  res.json(toJson(updated, balances.get(updated.id)));
});

// Permanently deletes an account, but only if no transactions use it
accountsRouter.delete("/:id", async (req, res) => {
  const account = await findOwned(req.user!.id, req.params.id);

  const used = await prisma.transaction.count({ where: { accountId: account.id } });
  if (used > 0) {
    throw new HttpError(
      409,
      `"${account.name}" has transactions, so it can't be deleted. You can archive it instead.`,
    );
  }

  await prisma.account.delete({ where: { id: account.id } });
  res.status(204).end();
});
