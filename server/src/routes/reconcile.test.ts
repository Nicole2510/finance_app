import { describe, it, expect, beforeEach, afterAll } from "vitest";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { as, resetDb } from "../test/helpers.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const alice = as("user_alice");
const bob = as("user_bob");

// An account opened Oct 1 with $1000 and one $62.14 expense: balance 937.86
async function setUp(user: ReturnType<typeof as> = alice) {
  const { body: account } = await user.post("/api/accounts", {
    name: "Maple Bank",
    type: "CHEQUING",
    openingBalance: "1000.00",
    openingDate: "2026-10-01",
  });
  const { body: categories } = await user.get("/api/categories");
  const groceries = categories.find((c: { name: string }) => c.name === "Groceries").id;
  await user.post("/api/transactions", {
    type: "EXPENSE",
    amount: "62.14",
    date: "2026-10-18",
    accountId: account.id,
    categoryId: groceries,
  });
  return account;
}

function reconcile(user: ReturnType<typeof as>, accountId: string, body: object) {
  return user.post(`/api/accounts/${accountId}/reconcile`, body);
}

async function balanceOf(id: string) {
  const { body } = await alice.get("/api/accounts?includeArchived=true");
  return body.find((a: { id: string }) => a.id === id).currentBalance;
}

describe("reconciling an account", () => {
  it("adds money when the bank shows more", async () => {
    const account = await setUp();

    const res = await reconcile(alice, account.id, { actualBalance: "950.26", date: "2026-11-14" });

    expect(res.status).toBe(201);
    expect(res.body.adjustment).toBe("12.40");
    expect(res.body.account.currentBalance).toBe("950.26");
    const stored = await prisma.transaction.findFirstOrThrow({ where: { type: "ADJUSTMENT" } });
    expect(stored.amount.toFixed(2)).toBe("12.40");
    expect(stored.categoryId).toBeNull();
  });

  it("takes money away when the bank shows less", async () => {
    const account = await setUp();

    const res = await reconcile(alice, account.id, { actualBalance: "934.71", date: "2026-11-14" });

    expect(res.body.adjustment).toBe("-3.15");
    expect(await balanceOf(account.id)).toBe("934.71");
  });

  it("works for a credit card that owes more than recorded", async () => {
    const { body: card } = await alice.post("/api/accounts", {
      name: "Card",
      type: "CREDIT_CARD",
      openingBalance: "-530.00",
      openingDate: "2026-10-01",
    });

    const res = await reconcile(alice, card.id, { actualBalance: "-600.00", date: "2026-11-14" });

    expect(res.body.adjustment).toBe("-70.00");
    expect(res.body.account.currentBalance).toBe("-600.00");
  });

  it("is exact to the cent", async () => {
    const { body: account } = await alice.post("/api/accounts", {
      name: "Jar",
      type: "CASH",
      openingBalance: "0.30",
      openingDate: "2026-10-01",
    });

    const res = await reconcile(alice, account.id, { actualBalance: "0.31", date: "2026-11-14" });

    expect(res.body.adjustment).toBe("0.01");
  });

  it("refuses when the balance already matches", async () => {
    const account = await setUp();

    const res = await reconcile(alice, account.id, { actualBalance: "937.86", date: "2026-11-14" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already matches/);
    expect(await prisma.transaction.count({ where: { type: "ADJUSTMENT" } })).toBe(0);
  });

  it("moves the account's updated time forward", async () => {
    const account = await setUp();
    const longAgo = new Date("2026-01-01T00:00:00Z");
    await prisma.account.update({ where: { id: account.id }, data: { updatedAt: longAgo } });

    await reconcile(alice, account.id, { actualBalance: "950.26", date: "2026-11-14" });

    const stored = await prisma.account.findUniqueOrThrow({ where: { id: account.id } });
    expect(stored.updatedAt.getTime()).toBeGreaterThan(longAgo.getTime());
  });
});

describe("invalid reconciles", () => {
  it.each<[object, string]>([
    [{ actualBalance: "abc", date: "2026-11-14" }, "not money"],
    [{ actualBalance: "12.345", date: "2026-11-14" }, "3 decimals"],
    [{ actualBalance: 950, date: "2026-11-14" }, "a number, not a string"],
    [{ actualBalance: "950.26" }, "missing date"],
    [{ actualBalance: "950.26", date: "2026-02-30" }, "not a real date"],
    [{ actualBalance: "950.26", date: "2026-09-30" }, "before the opening date"],
    [{ actualBalance: "950.26", date: "2026-11-14", userId: "x" }, "sneaking in another user"],
  ])("rejects %o (%s)", async (body) => {
    const account = await setUp();

    const res = await reconcile(alice, account.id, body);

    expect(res.status).toBe(400);
    expect(await prisma.transaction.count({ where: { type: "ADJUSTMENT" } })).toBe(0);
  });

  it("refuses an archived account", async () => {
    const account = await setUp();
    await alice.patch(`/api/accounts/${account.id}`, { archived: true });

    const res = await reconcile(alice, account.id, { actualBalance: "950.26", date: "2026-11-14" });

    expect(res.status).toBe(400);
  });

  it("returns 404 for another user's account and changes nothing", async () => {
    const account = await setUp();
    await bob.get("/api/me");

    const res = await reconcile(bob, account.id, { actualBalance: "0", date: "2026-11-14" });

    expect(res.status).toBe(404);
    expect(await prisma.transaction.count({ where: { type: "ADJUSTMENT" } })).toBe(0);
  });
});

describe("adjustments as transactions", () => {
  async function withAdjustment() {
    const account = await setUp();
    await reconcile(alice, account.id, { actualBalance: "950.26", date: "2026-11-14" });
    const adjustment = await prisma.transaction.findFirstOrThrow({ where: { type: "ADJUSTMENT" } });
    return { account, adjustment };
  }

  it("shows up in the transaction list, with no category", async () => {
    await withAdjustment();

    const { body } = await alice.get("/api/transactions?month=2026-11");

    expect(body).toEqual([
      expect.objectContaining({ type: "ADJUSTMENT", amount: "12.40", category: null }),
    ]);
  });

  it("can't be edited", async () => {
    const { adjustment } = await withAdjustment();

    const res = await alice.patch(`/api/transactions/${adjustment.id}`, { amount: "1" });

    expect(res.status).toBe(400);
    const stored = await prisma.transaction.findUniqueOrThrow({ where: { id: adjustment.id } });
    expect(stored.amount.toFixed(2)).toBe("12.40");
  });

  it("can be deleted, putting the balance back", async () => {
    const { account, adjustment } = await withAdjustment();

    const res = await alice.delete(`/api/transactions/${adjustment.id}`);

    expect(res.status).toBe(204);
    expect(await balanceOf(account.id)).toBe("937.86");
  });

  it("can't be created through the normal transaction route", async () => {
    const account = await setUp();

    const res = await alice.post("/api/transactions", {
      type: "ADJUSTMENT",
      amount: "5",
      date: "2026-11-14",
      accountId: account.id,
    });

    expect(res.status).toBe(400);
  });
});

describe("the database itself enforces the rules", () => {
  async function ids() {
    const account = await setUp();
    const stored = await prisma.account.findUniqueOrThrow({ where: { id: account.id } });
    const category = await prisma.category.findFirstOrThrow({ where: { userId: stored.userId } });
    return { userId: stored.userId, accountId: stored.id, categoryId: category.id };
  }

  it.each<[string, (x: Awaited<ReturnType<typeof ids>>) => object]>([
    ["a zero adjustment", (x) => ({ type: "ADJUSTMENT", amount: "0", ...x, categoryId: null })],
    ["an adjustment with a category", (x) => ({ type: "ADJUSTMENT", amount: "5", ...x })],
    ["an expense with no category", (x) => ({ type: "EXPENSE", amount: "5", ...x, categoryId: null })],
    ["a negative expense", (x) => ({ type: "EXPENSE", amount: "-5", ...x })],
  ])("refuses %s even if the API were bypassed", async (_label, build) => {
    const x = await ids();

    await expect(
      prisma.transaction.create({
        data: { ...(build(x) as Prisma.TransactionUncheckedCreateInput), date: new Date("2026-11-14") },
      }),
    ).rejects.toThrow();
  });
});
