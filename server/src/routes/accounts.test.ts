import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../db.js";
import { as, resetDb } from "../test/helpers.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const alice = as("user_alice");
const bob = as("user_bob");

const valid = {
  name: "Maple Bank",
  type: "CHEQUING",
  openingBalance: "2430.00",
  openingDate: "2026-10-01",
};

// Adds a transaction straight to the database (transaction routes come in M4)
async function addTransaction(
  accountId: string,
  type: "INCOME" | "EXPENSE",
  amount: string,
  date: string,
) {
  const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });
  const category = await prisma.category.create({
    data: {
      name: `${type} ${amount} ${date} ${Math.random()}`,
      group: type === "INCOME" ? "INCOME" : "NEEDS",
      userId: account.userId,
    },
  });
  return prisma.transaction.create({
    data: {
      type,
      amount,
      date: new Date(date),
      userId: account.userId,
      accountId,
      categoryId: category.id,
    },
  });
}

async function balanceOf(user: ReturnType<typeof as>, id: string) {
  const list = await user.get("/api/accounts?includeArchived=true");
  return list.body.find((a: { id: string }) => a.id === id).currentBalance;
}

describe("creating accounts", () => {
  it("starts empty for a new user", async () => {
    const res = await alice.get("/api/accounts");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("creates an account whose current balance starts at the opening balance", async () => {
    const res = await alice.post("/api/accounts", valid);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: "Maple Bank",
      type: "CHEQUING",
      openingBalance: "2430.00",
      openingDate: "2026-10-01",
      currentBalance: "2430.00",
      archivedAt: null,
    });
  });

  it.each([
    ["2430", "2430.00"],
    ["2430.5", "2430.50"],
    ["0", "0.00"],
    ["-530.00", "-530.00"], // a credit card that's owed money
    ["9999999999.99", "9999999999.99"], // largest allowed
  ])("accepts opening balance %s (stored as %s)", async (input, stored) => {
    const res = await alice.post("/api/accounts", { ...valid, openingBalance: input });

    expect(res.status).toBe(201);
    expect(res.body.openingBalance).toBe(stored);
  });

  it("allows two accounts with the same name (e.g. Maple Bank chequing and credit card)", async () => {
    await alice.post("/api/accounts", valid);
    const res = await alice.post("/api/accounts", {
      ...valid,
      type: "CREDIT_CARD",
      openingBalance: "-530",
    });

    expect(res.status).toBe(201);
  });

  it.each<[object, string]>([
    [{ ...valid, name: "" }, "empty name"],
    [{ ...valid, name: "x".repeat(41) }, "name too long"],
    [{ ...valid, type: "PIGGY_BANK" }, "unknown type"],
    [{ ...valid, openingBalance: "abc" }, "balance not a number"],
    [{ ...valid, openingBalance: "12.345" }, "balance with 3 decimals"],
    [{ ...valid, openingBalance: 2430 }, "balance sent as a number, not a string"],
    [{ ...valid, openingBalance: "12345678901" }, "balance too large"],
    [{ ...valid, openingDate: "Oct 1" }, "date in the wrong format"],
    [{ ...valid, openingDate: "2026-13-01" }, "month 13"],
    [{ ...valid, openingDate: "2026-02-30" }, "February 30th"],
    [{ name: "Maple Bank", type: "CHEQUING" }, "missing balance and date"],
    [{ ...valid, userId: "someone-else" }, "sneaking in another user"],
  ])("rejects invalid input (%o, %s)", async (body) => {
    const res = await alice.post("/api/accounts", body);

    expect(res.status).toBe(400);
    expect(await prisma.account.count()).toBe(0);
  });
});

describe("calculated balances", () => {
  it("adds income and subtracts expenses", async () => {
    const { body: account } = await alice.post("/api/accounts", valid);
    await addTransaction(account.id, "INCOME", "1000.00", "2026-10-05");
    await addTransaction(account.id, "EXPENSE", "62.14", "2026-10-18");

    // 2430.00 + 1000.00 − 62.14
    expect(await balanceOf(alice, account.id)).toBe("3367.86");
  });

  it("is exact with cents (no floating-point rounding errors)", async () => {
    const { body: account } = await alice.post("/api/accounts", { ...valid, openingBalance: "0" });
    await addTransaction(account.id, "INCOME", "0.10", "2026-10-05");
    await addTransaction(account.id, "INCOME", "0.20", "2026-10-05");

    expect(await balanceOf(alice, account.id)).toBe("0.30");
  });

  it("ignores transactions before the opening date (already in the opening balance)", async () => {
    const { body: account } = await alice.post("/api/accounts", valid);
    await addTransaction(account.id, "EXPENSE", "500.00", "2026-09-30");
    await addTransaction(account.id, "EXPENSE", "30.00", "2026-10-01"); // same day counts

    expect(await balanceOf(alice, account.id)).toBe("2400.00");
  });

  it("only counts each account's own transactions", async () => {
    const { body: maple } = await alice.post("/api/accounts", valid);
    const { body: ws } = await alice.post("/api/accounts", { ...valid, name: "Birch Savings" });
    await addTransaction(ws.id, "INCOME", "100.00", "2026-10-05");

    expect(await balanceOf(alice, maple.id)).toBe("2430.00");
    expect(await balanceOf(alice, ws.id)).toBe("2530.00");
  });

  it("goes negative for a credit card as spending increases", async () => {
    const { body: card } = await alice.post("/api/accounts", {
      ...valid,
      type: "CREDIT_CARD",
      openingBalance: "-530.00",
    });
    await addTransaction(card.id, "EXPENSE", "24.99", "2026-10-14");

    expect(await balanceOf(alice, card.id)).toBe("-554.99");
  });
});

describe("editing accounts", () => {
  it("correcting the opening balance shifts the current balance, keeping transactions", async () => {
    const { body: account } = await alice.post("/api/accounts", valid);
    const tx = await addTransaction(account.id, "EXPENSE", "100.00", "2026-10-05");

    const res = await alice.patch(`/api/accounts/${account.id}`, { openingBalance: "2340.00" });

    expect(res.status).toBe(200);
    expect(res.body.openingBalance).toBe("2340.00");
    expect(res.body.currentBalance).toBe("2240.00"); // 2340 − 100
    expect(await prisma.transaction.findUnique({ where: { id: tx.id } })).not.toBeNull();
  });

  it("moves updatedAt forward when an account is edited", async () => {
    const { body: account } = await alice.post("/api/accounts", valid);

    const res = await alice.patch(`/api/accounts/${account.id}`, { name: "New name" });

    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(
      new Date(account.updatedAt).getTime(),
    );
  });

  it("renames and changes type", async () => {
    const { body: account } = await alice.post("/api/accounts", valid);
    const res = await alice.patch(`/api/accounts/${account.id}`, {
      name: "Maple Savings",
      type: "SAVINGS",
    });

    expect(res.body).toMatchObject({ name: "Maple Savings", type: "SAVINGS" });
  });

  it("allows moving the opening date earlier", async () => {
    const { body: account } = await alice.post("/api/accounts", valid);
    await addTransaction(account.id, "EXPENSE", "10.00", "2026-10-05");

    const res = await alice.patch(`/api/accounts/${account.id}`, { openingDate: "2026-09-01" });
    expect(res.status).toBe(200);
    expect(res.body.openingDate).toBe("2026-09-01");
  });

  it("blocks moving the opening date after existing transactions", async () => {
    const { body: account } = await alice.post("/api/accounts", valid);
    await addTransaction(account.id, "EXPENSE", "10.00", "2026-10-05");

    const res = await alice.patch(`/api/accounts/${account.id}`, { openingDate: "2026-10-10" });

    expect(res.status).toBe(409);
    const unchanged = await prisma.account.findUniqueOrThrow({ where: { id: account.id } });
    expect(unchanged.openingDate.toISOString().slice(0, 10)).toBe("2026-10-01");
  });

  it("rejects invalid changes", async () => {
    const { body: account } = await alice.post("/api/accounts", valid);
    const url = `/api/accounts/${account.id}`;

    expect((await alice.patch(url, { name: "" })).status).toBe(400);
    expect((await alice.patch(url, { openingBalance: "12.345" })).status).toBe(400);
    expect((await alice.patch(url, { openingDate: "2026-02-30" })).status).toBe(400);
    expect((await alice.patch(url, { type: "PIGGY_BANK" })).status).toBe(400);
    expect((await alice.patch(url, { userId: "someone-else" })).status).toBe(400);
  });

  it("archives and restores", async () => {
    const { body: account } = await alice.post("/api/accounts", valid);

    await alice.patch(`/api/accounts/${account.id}`, { archived: true });
    expect((await alice.get("/api/accounts")).body).toEqual([]);
    const all = await alice.get("/api/accounts?includeArchived=true");
    expect(all.body[0].archivedAt).not.toBeNull();

    await alice.patch(`/api/accounts/${account.id}`, { archived: false });
    expect((await alice.get("/api/accounts")).body).toHaveLength(1);
  });
});

describe("deleting accounts", () => {
  it("deletes an account with no transactions", async () => {
    const { body: account } = await alice.post("/api/accounts", valid);
    const res = await alice.delete(`/api/accounts/${account.id}`);

    expect(res.status).toBe(204);
    expect(await prisma.account.count()).toBe(0);
  });

  it("refuses to delete an account with transactions (archive instead)", async () => {
    const { body: account } = await alice.post("/api/accounts", valid);
    await addTransaction(account.id, "EXPENSE", "10.00", "2026-10-05");

    const res = await alice.delete(`/api/accounts/${account.id}`);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/archive/i);
    expect(await prisma.account.count()).toBe(1);
  });
});

describe("data isolation", () => {
  it("never shows one user's accounts to another", async () => {
    await alice.post("/api/accounts", valid);

    expect((await bob.get("/api/accounts")).body).toEqual([]);
  });

  it("returns 404 when another user tries to change or delete an account", async () => {
    const { body: account } = await alice.post("/api/accounts", valid);

    const edit = await bob.patch(`/api/accounts/${account.id}`, { openingBalance: "0" });
    const remove = await bob.delete(`/api/accounts/${account.id}`);

    expect(edit.status).toBe(404);
    expect(remove.status).toBe(404);
    const unchanged = await prisma.account.findUniqueOrThrow({ where: { id: account.id } });
    expect(unchanged.openingBalance.toFixed(2)).toBe("2430.00");
  });
});
