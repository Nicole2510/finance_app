import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireUser } from "../middleware/requireUser.js";
import { duplicateKey } from "../lib/duplicateKey.js";
import { parseBody } from "../lib/validation.js";
import { checkReferences, createSchema, touchAccounts } from "./transactions.js";

// Bulk import. The browser reads the file and sends cleaned-up rows in the same
// shape as adding a transaction by hand, so every row follows the same rules.
export const importRouter = Router();
importRouter.use(requireUser);

const MAX_ROWS = 2000;

const importSchema = z.strictObject({
  // preview: report on every row, save nothing. import: save every row or none.
  mode: z.enum(["preview", "import"]),
  rows: z
    .array(z.unknown())
    .min(1, "There are no rows to import")
    .max(MAX_ROWS, `Import at most ${MAX_ROWS} rows at a time`),
});

type RowResult = {
  index: number; // position in the rows sent, so the browser can match it up
  status: "ready" | "problem" | "duplicate";
  message?: string;
};

// POST /api/transactions/import
importRouter.post("/", async (req, res) => {
  const userId = req.user!.id;
  const { mode, rows } = parseBody(importSchema, req.body);

  // Load everything the rows might point to once, instead of once per row
  const [accounts, categories, sources] = await Promise.all([
    prisma.account.findMany({ where: { userId } }),
    prisma.category.findMany({ where: { userId } }),
    prisma.incomeSource.findMany({ where: { userId } }),
  ]);
  const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((r) => [r.id, r]));
  const accountById = byId(accounts);
  const categoryById = byId(categories);
  const sourceById = byId(sources);

  const results: RowResult[] = [];
  const valid: { index: number; data: z.infer<typeof createSchema> }[] = [];

  rows.forEach((row, index) => {
    const parsed = createSchema.safeParse(row);
    if (!parsed.success) {
      results.push({ index, status: "problem", message: parsed.error.issues[0]?.message });
      return;
    }
    const data = parsed.data;
    const problem = checkReferences(data, {
      account: accountById.get(data.accountId) ?? null,
      category: categoryById.get(data.categoryId) ?? null,
      source: data.incomeSourceId ? (sourceById.get(data.incomeSourceId) ?? null) : null,
    });
    if (problem) {
      results.push({ index, status: "problem", message: problem });
      return;
    }
    results.push({ index, status: "ready" });
    valid.push({ index, data });
  });

  // Duplicates: already saved, or earlier in this same file
  if (valid.length > 0) {
    const dates = valid.map((v) => v.data.date).sort();
    const existing = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: new Date(dates[0]), lte: new Date(dates[dates.length - 1]) },
      },
      select: { accountId: true, date: true, type: true, amount: true, categoryId: true },
    });
    const seen = new Set(
      existing.map((t) =>
        duplicateKey({
          ...t,
          date: t.date.toISOString().slice(0, 10),
          amount: t.amount.toFixed(2),
        }),
      ),
    );
    for (const { index, data } of valid) {
      const key = duplicateKey(data);
      if (seen.has(key)) {
        results[index] = {
          index,
          status: "duplicate",
          message: "Looks like a transaction you already have",
        };
      }
      seen.add(key);
    }
  }

  const count = (status: RowResult["status"]) => results.filter((r) => r.status === status).length;
  const summary = {
    ready: count("ready"),
    problems: count("problem"),
    duplicates: count("duplicate"),
  };

  if (mode === "preview") {
    res.json({ rows: results, summary });
    return;
  }

  // Importing: all or nothing. Duplicates are saved too, because the browser
  // only sends the ones the person chose to keep.
  if (summary.problems > 0) {
    res
      .status(400)
      .json({ error: "Fix or remove the rows with problems first", rows: results, summary });
    return;
  }

  await prisma.$transaction([
    prisma.transaction.createMany({
      data: valid.map(({ data }) => ({ ...data, date: new Date(data.date), userId })),
    }),
    touchAccounts(userId, [...new Set(valid.map(({ data }) => data.accountId))]),
  ]);
  res.status(201).json({ imported: valid.length });
});
