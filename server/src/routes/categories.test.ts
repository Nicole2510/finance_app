import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../db.js";
import { as, resetDb } from "../test/helpers.js";
import { DEFAULT_CATEGORIES } from "../lib/defaultCategories.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const alice = as("user_alice");
const bob = as("user_bob");

describe("default categories", () => {
  it("gives a new user the default categories with emojis and groups", async () => {
    const res = await alice.get("/api/categories");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(res.body).toContainEqual(
      expect.objectContaining({ name: "Groceries", emoji: "🛒", group: "NEEDS" }),
    );
    expect(res.body).toContainEqual(
      expect.objectContaining({ name: "Salary", emoji: "💼", group: "INCOME" }),
    );
  });

  it("seeds an existing user who has no categories yet", async () => {
    await alice.get("/api/me");
    await prisma.category.deleteMany();

    const res = await alice.get("/api/categories");
    expect(res.body).toHaveLength(DEFAULT_CATEGORIES.length);
  });
});

describe("creating categories", () => {
  it("creates a custom category with an emoji", async () => {
    const res = await alice.post("/api/categories", {
      name: "Pets",
      emoji: "🐶",
      group: "WANTS",
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "Pets", emoji: "🐶", group: "WANTS" });
  });

  it("creates a category without an emoji", async () => {
    const res = await alice.post("/api/categories", { name: "Pets", group: "WANTS" });

    expect(res.status).toBe(201);
    expect(res.body.emoji).toBeNull();
  });

  it("rejects a duplicate name, ignoring capitals", async () => {
    await alice.get("/api/categories");
    const res = await alice.post("/api/categories", { name: "groceries", group: "NEEDS" });

    expect(res.status).toBe(409);
  });

  it.each([
    [{ name: "", group: "NEEDS" }, "empty name"],
    [{ name: "Pets", group: "FUN" }, "unknown group"],
    [{ name: "Pets", group: "WANTS", emoji: "abc" }, "text instead of emoji"],
    [{ name: "Pets", group: "WANTS", emoji: "🐶🐱" }, "two emojis"],
    [{ name: "Pets", group: "WANTS", userId: "someone-else" }, "unexpected field"],
  ])("rejects invalid input (%s)", async (body, _label) => {
    const res = await alice.post("/api/categories", body);
    expect(res.status).toBe(400);
  });

  it("accepts multi-part emojis like flags", async () => {
    const res = await alice.post("/api/categories", {
      name: "Canada Trip",
      emoji: "🇨🇦",
      group: "WANTS",
    });
    expect(res.status).toBe(201);
  });
});

describe("updating categories", () => {
  async function groceries() {
    const list = await alice.get("/api/categories");
    return list.body.find((c: { name: string }) => c.name === "Groceries");
  }

  it("renames, changes group, and changes emoji", async () => {
    const { id } = await groceries();
    const res = await alice.patch(`/api/categories/${id}`, {
      name: "Food",
      group: "WANTS",
      emoji: "🥕",
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "Food", group: "WANTS", emoji: "🥕" });
  });

  it("rejects renaming to a name that's already used, ignoring capitals", async () => {
    const { id } = await groceries();
    const res = await alice.patch(`/api/categories/${id}`, { name: "RENT" });

    expect(res.status).toBe(409);
    const unchanged = await prisma.category.findUniqueOrThrow({ where: { id } });
    expect(unchanged.name).toBe("Groceries");
  });

  it("allows saving a category with its own name (only changing capitals)", async () => {
    const { id } = await groceries();
    const res = await alice.patch(`/api/categories/${id}`, { name: "groceries" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("groceries");
  });

  it("rejects invalid changes when updating", async () => {
    const { id } = await groceries();
    const url = `/api/categories/${id}`;

    expect((await alice.patch(url, { name: "" })).status).toBe(400);
    expect((await alice.patch(url, { group: "FUN" })).status).toBe(400);
    expect((await alice.patch(url, { emoji: "🛒🛒" })).status).toBe(400);
    expect((await alice.patch(url, { archived: "yes" })).status).toBe(400);
    expect((await alice.patch(url, { userId: "someone-else" })).status).toBe(400);
  });

  it("removes an emoji with null", async () => {
    const { id } = await groceries();
    const res = await alice.patch(`/api/categories/${id}`, { emoji: null });

    expect(res.body.emoji).toBeNull();
  });

  it("archives and unarchives", async () => {
    const { id } = await groceries();

    await alice.patch(`/api/categories/${id}`, { archived: true });
    const active = await alice.get("/api/categories");
    const all = await alice.get("/api/categories?includeArchived=true");
    expect(active.body.some((c: { id: string }) => c.id === id)).toBe(false);
    expect(all.body.find((c: { id: string }) => c.id === id).archivedAt).not.toBeNull();

    await alice.patch(`/api/categories/${id}`, { archived: false });
    const restored = await alice.get("/api/categories");
    expect(restored.body.some((c: { id: string }) => c.id === id)).toBe(true);
  });

  it("blocks switching a used category between spending and income", async () => {
    const { id } = await groceries();
    const user = await prisma.user.findFirstOrThrow();
    const account = await prisma.account.create({
      data: { name: "Chequing", type: "CHEQUING", userId: user.id },
    });
    await prisma.transaction.create({
      data: {
        type: "EXPENSE",
        amount: "12.50",
        date: new Date("2026-10-01"),
        userId: user.id,
        accountId: account.id,
        categoryId: id,
      },
    });

    const res = await alice.patch(`/api/categories/${id}`, { group: "INCOME" });
    expect(res.status).toBe(409);
  });
});

describe("deleting categories", () => {
  it("deletes an unused category", async () => {
    const created = await alice.post("/api/categories", { name: "Pets", group: "WANTS" });
    const res = await alice.delete(`/api/categories/${created.body.id}`);

    expect(res.status).toBe(204);
    const gone = await prisma.category.findUnique({ where: { id: created.body.id } });
    expect(gone).toBeNull();
  });

  it("refuses to delete a category with transactions (archive instead)", async () => {
    const list = await alice.get("/api/categories");
    const groceries = list.body.find((c: { name: string }) => c.name === "Groceries");
    const user = await prisma.user.findFirstOrThrow();
    const account = await prisma.account.create({
      data: { name: "Chequing", type: "CHEQUING", userId: user.id },
    });
    await prisma.transaction.create({
      data: {
        type: "EXPENSE",
        amount: "20.00",
        date: new Date("2026-10-01"),
        userId: user.id,
        accountId: account.id,
        categoryId: groceries.id,
      },
    });

    const res = await alice.delete(`/api/categories/${groceries.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/archive/i);
    expect(await prisma.category.findUnique({ where: { id: groceries.id } })).not.toBeNull();
  });
});

describe("data isolation", () => {
  it("returns 404 when deleting someone else's category", async () => {
    const created = await alice.post("/api/categories", { name: "Mine", group: "WANTS" });
    const res = await bob.delete(`/api/categories/${created.body.id}`);

    expect(res.status).toBe(404);
    expect(await prisma.category.findUnique({ where: { id: created.body.id } })).not.toBeNull();
  });

  it("never shows one user's categories to another", async () => {
    await alice.post("/api/categories", { name: "Alice Secret", group: "WANTS" });
    const res = await bob.get("/api/categories");

    expect(res.body.some((c: { name: string }) => c.name === "Alice Secret")).toBe(false);
  });

  it("returns 404 when changing someone else's category", async () => {
    const created = await alice.post("/api/categories", { name: "Mine", group: "WANTS" });
    const res = await bob.patch(`/api/categories/${created.body.id}`, { name: "Stolen" });

    expect(res.status).toBe(404);
    const stillMine = await prisma.category.findUniqueOrThrow({ where: { id: created.body.id } });
    expect(stillMine.name).toBe("Mine");
  });

  it("lets two users use the same category name", async () => {
    await alice.get("/api/categories");
    const res = await bob.post("/api/categories", { name: "Pets", group: "WANTS" });
    const res2 = await alice.post("/api/categories", { name: "Pets", group: "WANTS" });

    expect(res.status).toBe(201);
    expect(res2.status).toBe(201);
  });
});

describe("database rules", () => {
  it("rejects a transaction amount of zero or less", async () => {
    const list = await alice.get("/api/categories");
    const user = await prisma.user.findFirstOrThrow();
    const account = await prisma.account.create({
      data: { name: "Chequing", type: "CHEQUING", userId: user.id },
    });

    await expect(
      prisma.transaction.create({
        data: {
          type: "EXPENSE",
          amount: "0",
          date: new Date("2026-10-01"),
          userId: user.id,
          accountId: account.id,
          categoryId: list.body[0].id,
        },
      }),
    ).rejects.toThrow();
  });
});
