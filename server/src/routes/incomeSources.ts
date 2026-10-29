import { Router } from "express";
import { z } from "zod";
import type { IncomeSource } from "@prisma/client";
import { prisma } from "../db.js";
import { requireUser } from "../middleware/requireUser.js";
import { HttpError } from "../lib/httpError.js";
import { emojiSchema, nameSchema, parseBody } from "../lib/validation.js";

// Who pays the user (e.g. each employer). Separate from categories.
export const incomeSourcesRouter = Router();
incomeSourcesRouter.use(requireUser);

const createSchema = z.strictObject({
  name: nameSchema,
  emoji: emojiSchema.nullish(),
});

// Every field optional; emoji: null removes it; archived: true/false
const updateSchema = z.strictObject({
  name: nameSchema.optional(),
  emoji: emojiSchema.nullable().optional(),
  archived: z.boolean().optional(),
});

function toJson(s: IncomeSource) {
  const { id, name, emoji, archivedAt } = s;
  return { id, name, emoji, archivedAt };
}

// Finds a source only if it belongs to this user; otherwise 404
async function findOwned(userId: string, id: string) {
  const source = await prisma.incomeSource.findFirst({ where: { id, userId } });
  if (!source) throw new HttpError(404, "Income source not found");
  return source;
}

// Names are unique per user, ignoring capitals
async function assertNameAvailable(userId: string, name: string, exceptId?: string) {
  const clash = await prisma.incomeSource.findFirst({
    where: {
      userId,
      name: { equals: name, mode: "insensitive" },
      ...(exceptId ? { NOT: { id: exceptId } } : {}),
    },
  });
  if (clash) {
    throw new HttpError(409, `You already have an income source called "${clash.name}"`);
  }
}

// GET /api/income-sources?includeArchived=true
incomeSourcesRouter.get("/", async (req, res) => {
  const sources = await prisma.incomeSource.findMany({
    where: {
      userId: req.user!.id,
      ...(req.query.includeArchived === "true" ? {} : { archivedAt: null }),
    },
    orderBy: { name: "asc" },
  });

  res.json(sources.map(toJson));
});

incomeSourcesRouter.post("/", async (req, res) => {
  const userId = req.user!.id;
  const data = parseBody(createSchema, req.body);
  await assertNameAvailable(userId, data.name);

  const source = await prisma.incomeSource.create({
    data: { ...data, emoji: data.emoji ?? null, userId },
  });
  res.status(201).json(toJson(source));
});

// Archiving only hides the source; past transactions keep their link
incomeSourcesRouter.patch("/:id", async (req, res) => {
  const userId = req.user!.id;
  const source = await findOwned(userId, req.params.id);
  const { archived, ...changes } = parseBody(updateSchema, req.body);

  if (changes.name !== undefined) {
    await assertNameAvailable(userId, changes.name, source.id);
  }

  const updated = await prisma.incomeSource.update({
    where: { id: source.id },
    data: {
      ...changes,
      ...(archived === undefined ? {} : { archivedAt: archived ? new Date() : null }),
    },
  });
  res.json(toJson(updated));
});

// Permanently deletes a source, but only if no transactions use it
incomeSourcesRouter.delete("/:id", async (req, res) => {
  const source = await findOwned(req.user!.id, req.params.id);

  const used = await prisma.transaction.count({ where: { incomeSourceId: source.id } });
  if (used > 0) {
    throw new HttpError(
      409,
      `"${source.name}" has transactions, so it can't be deleted. You can archive it instead.`,
    );
  }

  await prisma.incomeSource.delete({ where: { id: source.id } });
  res.status(204).end();
});
