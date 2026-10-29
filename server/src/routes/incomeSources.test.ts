import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../db.js";
import { as, resetDb } from "../test/helpers.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const alice = as("user_alice");
const bob = as("user_bob");

describe("income sources", () => {
  it("starts empty for a new user", async () => {
    const res = await alice.get("/api/income-sources");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("creates several sources, with or without an emoji", async () => {
    const a = await alice.post("/api/income-sources", { name: "Acme", emoji: "💄" });
    const b = await alice.post("/api/income-sources", { name: "Envy" });

    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(b.body.emoji).toBeNull();

    const list = await alice.get("/api/income-sources");
    expect(list.body.map((s: { name: string }) => s.name)).toEqual(["Acme", "Envy"]);
  });

  it("rejects a duplicate name, ignoring capitals", async () => {
    await alice.post("/api/income-sources", { name: "Acme" });
    const res = await alice.post("/api/income-sources", { name: "ACME" });

    expect(res.status).toBe(409);
  });

  it.each([
    { name: "" }, // empty name
    { name: "   " }, // only spaces
    { name: "x".repeat(41) }, // too long
    { name: "Acme", emoji: "abc" }, // text instead of an emoji
    { name: "Acme", emoji: "💄💄" }, // two emojis
    { name: "Acme", userId: "someone-else" }, // sneaking in another user
  ])("rejects invalid input (%o)", async (body) => {
    const res = await alice.post("/api/income-sources", body);

    expect(res.status).toBe(400);
    expect(await prisma.incomeSource.count()).toBe(0);
  });

  it("rejects renaming to a name that's already used, ignoring capitals", async () => {
    await alice.post("/api/income-sources", { name: "Acme" });
    const envy = await alice.post("/api/income-sources", { name: "Envy" });

    const res = await alice.patch(`/api/income-sources/${envy.body.id}`, { name: "acme" });

    expect(res.status).toBe(409);
    const unchanged = await prisma.incomeSource.findUniqueOrThrow({ where: { id: envy.body.id } });
    expect(unchanged.name).toBe("Envy");
  });

  it("rejects invalid changes when updating", async () => {
    const created = await alice.post("/api/income-sources", { name: "Acme" });
    const url = `/api/income-sources/${created.body.id}`;

    expect((await alice.patch(url, { name: "" })).status).toBe(400);
    expect((await alice.patch(url, { emoji: "abc" })).status).toBe(400);
    expect((await alice.patch(url, { archived: "yes" })).status).toBe(400);
    expect((await alice.patch(url, { userId: "someone-else" })).status).toBe(400);
  });

  it("renames, changes emoji, and removes emoji", async () => {
    const created = await alice.post("/api/income-sources", { name: "Acme", emoji: "💄" });
    const id = created.body.id;

    const renamed = await alice.patch(`/api/income-sources/${id}`, {
      name: "Acme Canada",
      emoji: "🛍️",
    });
    expect(renamed.body).toMatchObject({ name: "Acme Canada", emoji: "🛍️" });

    const cleared = await alice.patch(`/api/income-sources/${id}`, { emoji: null });
    expect(cleared.body.emoji).toBeNull();
  });

  it("archiving hides the source but keeps its past transactions linked", async () => {
    const created = await alice.post("/api/income-sources", { name: "Acme" });
    const id = created.body.id;

    const categories = await alice.get("/api/categories");
    const salary = categories.body.find((c: { name: string }) => c.name === "Salary");
    const user = await prisma.user.findFirstOrThrow();
    const account = await prisma.account.create({
      data: { name: "Chequing", type: "CHEQUING", userId: user.id },
    });
    const paycheck = await prisma.transaction.create({
      data: {
        type: "INCOME",
        amount: "950.00",
        date: new Date("2026-10-15"),
        userId: user.id,
        accountId: account.id,
        categoryId: salary.id,
        incomeSourceId: id,
      },
    });

    await alice.patch(`/api/income-sources/${id}`, { archived: true });

    const active = await alice.get("/api/income-sources");
    expect(active.body).toEqual([]);

    const stillLinked = await prisma.transaction.findUniqueOrThrow({ where: { id: paycheck.id } });
    expect(stillLinked.incomeSourceId).toBe(id);
  });

  it("allows income transactions without a source", async () => {
    const categories = await alice.get("/api/categories");
    const salary = categories.body.find((c: { name: string }) => c.name === "Salary");
    const user = await prisma.user.findFirstOrThrow();
    const account = await prisma.account.create({
      data: { name: "Chequing", type: "CHEQUING", userId: user.id },
    });

    const tx = await prisma.transaction.create({
      data: {
        type: "INCOME",
        amount: "50.00",
        date: new Date("2026-10-15"),
        userId: user.id,
        accountId: account.id,
        categoryId: salary.id,
      },
    });
    expect(tx.incomeSourceId).toBeNull();
  });
});

describe("deleting income sources", () => {
  it("deletes an unused source", async () => {
    const created = await alice.post("/api/income-sources", { name: "Envy" });
    const res = await alice.delete(`/api/income-sources/${created.body.id}`);

    expect(res.status).toBe(204);
    expect(await prisma.incomeSource.findUnique({ where: { id: created.body.id } })).toBeNull();
  });

  it("refuses to delete a source with transactions (archive instead)", async () => {
    const created = await alice.post("/api/income-sources", { name: "Acme" });
    const categories = await alice.get("/api/categories");
    const salary = categories.body.find((c: { name: string }) => c.name === "Salary");
    const user = await prisma.user.findFirstOrThrow();
    const account = await prisma.account.create({
      data: { name: "Chequing", type: "CHEQUING", userId: user.id },
    });
    await prisma.transaction.create({
      data: {
        type: "INCOME",
        amount: "900.00",
        date: new Date("2026-10-15"),
        userId: user.id,
        accountId: account.id,
        categoryId: salary.id,
        incomeSourceId: created.body.id,
      },
    });

    const res = await alice.delete(`/api/income-sources/${created.body.id}`);
    expect(res.status).toBe(409);
    expect(await prisma.incomeSource.findUnique({ where: { id: created.body.id } })).not.toBeNull();
  });
});

describe("data isolation", () => {
  it("returns 404 when deleting someone else's source", async () => {
    const created = await alice.post("/api/income-sources", { name: "Acme" });
    const res = await bob.delete(`/api/income-sources/${created.body.id}`);

    expect(res.status).toBe(404);
    expect(await prisma.incomeSource.findUnique({ where: { id: created.body.id } })).not.toBeNull();
  });

  it("never shows one user's sources to another", async () => {
    await alice.post("/api/income-sources", { name: "Acme" });
    const res = await bob.get("/api/income-sources");

    expect(res.body).toEqual([]);
  });

  it("returns 404 when changing someone else's source", async () => {
    const created = await alice.post("/api/income-sources", { name: "Acme" });
    const res = await bob.patch(`/api/income-sources/${created.body.id}`, { archived: true });

    expect(res.status).toBe(404);
    const unchanged = await prisma.incomeSource.findUniqueOrThrow({
      where: { id: created.body.id },
    });
    expect(unchanged.archivedAt).toBeNull();
  });
});
