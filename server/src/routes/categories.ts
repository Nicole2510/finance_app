import { Router } from "express";
import { z } from "zod";
import { CategoryGroup, type Category } from "@prisma/client";
import { prisma } from "../db.js";
import { requireUser } from "../middleware/requireUser.js";
import { ensureDefaultCategories } from "../lib/defaultCategories.js";
import { HttpError } from "../lib/httpError.js";
import { emojiSchema, nameSchema, parseBody } from "../lib/validation.js";

export const categoriesRouter = Router();
categoriesRouter.use(requireUser);

const createSchema = z.strictObject({
  name: nameSchema,
  emoji: emojiSchema.nullish(),
  group: z.enum(CategoryGroup),
});

// Every field optional; emoji: null removes it; archived: true/false
const updateSchema = z.strictObject({
  name: nameSchema.optional(),
  emoji: emojiSchema.nullable().optional(),
  group: z.enum(CategoryGroup).optional(),
  archived: z.boolean().optional(),
});

function toJson(c: Category) {
  const { id, name, emoji, group, archivedAt } = c;
  return { id, name, emoji, group, archivedAt };
}

// Finds a category only if it belongs to this user; otherwise 404
// (we never reveal that someone else's category exists)
async function findOwned(userId: string, id: string) {
  const category = await prisma.category.findFirst({ where: { id, userId } });
  if (!category) throw new HttpError(404, "Category not found");
  return category;
}

// Names are unique per user, ignoring capitals ("groceries" = "Groceries")
async function assertNameAvailable(userId: string, name: string, exceptId?: string) {
  const clash = await prisma.category.findFirst({
    where: {
      userId,
      name: { equals: name, mode: "insensitive" },
      ...(exceptId ? { NOT: { id: exceptId } } : {}),
    },
  });
  if (clash) {
    throw new HttpError(409, `You already have a category called "${clash.name}"`);
  }
}

// GET /api/categories?includeArchived=true
categoriesRouter.get("/", async (req, res) => {
  const userId = req.user!.id;
  await ensureDefaultCategories(userId);

  const categories = await prisma.category.findMany({
    where: {
      userId,
      ...(req.query.includeArchived === "true" ? {} : { archivedAt: null }),
    },
    orderBy: [{ group: "asc" }, { name: "asc" }],
  });

  res.json(categories.map(toJson));
});

categoriesRouter.post("/", async (req, res) => {
  const userId = req.user!.id;
  const data = parseBody(createSchema, req.body);
  await assertNameAvailable(userId, data.name);

  const category = await prisma.category.create({
    data: { ...data, emoji: data.emoji ?? null, userId },
  });
  res.status(201).json(toJson(category));
});

categoriesRouter.patch("/:id", async (req, res) => {
  const userId = req.user!.id;
  const category = await findOwned(userId, req.params.id);
  const { archived, ...changes } = parseBody(updateSchema, req.body);

  if (changes.name !== undefined) {
    await assertNameAvailable(userId, changes.name, category.id);
  }

  // Moving between income and spending would change the meaning of past
  // transactions, so only allow it while the category is unused
  const crossesIncome =
    changes.group !== undefined &&
    (changes.group === "INCOME") !== (category.group === "INCOME");
  if (crossesIncome) {
    const used = await prisma.transaction.count({ where: { categoryId: category.id } });
    if (used > 0) {
      throw new HttpError(
        409,
        "This category already has transactions, so it can't switch between income and spending",
      );
    }
  }

  const updated = await prisma.category.update({
    where: { id: category.id },
    data: {
      ...changes,
      ...(archived === undefined ? {} : { archivedAt: archived ? new Date() : null }),
    },
  });
  res.json(toJson(updated));
});

// Permanently deletes a category, but only if no transactions use it
// (otherwise history would break, so the user should archive it instead)
categoriesRouter.delete("/:id", async (req, res) => {
  const category = await findOwned(req.user!.id, req.params.id);

  const used = await prisma.transaction.count({ where: { categoryId: category.id } });
  if (used > 0) {
    throw new HttpError(
      409,
      `"${category.name}" has transactions, so it can't be deleted. You can archive it instead.`,
    );
  }

  await prisma.category.delete({ where: { id: category.id } });
  res.status(204).end();
});
