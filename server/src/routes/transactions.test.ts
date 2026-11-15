import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../db.js";
import { as, resetDb } from "../test/helpers.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const alice = as("user_alice");
const bob = as("user_bob");

type Category = { id: string; name: string };

// Gives a user an account (opened Oct 1) and their default categories
async function setUp(user: ReturnType<typeof as>) {
  const { body: account } = await user.post("/api/accounts", {
    name: "Maple Bank",
    type: "CHEQUING",
    openingBalance: "1000.00",
    openingDate: "2026-10-01",
  });
  const { body: categories } = await user.get("/api/categories");
  const find = (name: string) => categories.find((c: Category) => c.name === name).id;

  return { account, groceries: find("Groceries"), rent: find("Rent"), salary: find("Salary") };
}

async function balanceOf(user: ReturnType<typeof as>, id: string) {
  const { body } = await user.get("/api/accounts");
  return body.find((a: { id: string }) => a.id === id).currentBalance;
}

describe("adding transactions", () => {
  it("adds an expense and returns it with its account and category", async () => {
    const { account, groceries } = await setUp(alice);

    const res = await alice.post("/api/transactions", {
      type: "EXPENSE",
      amount: "62.14",
      date: "2026-10-18",
      accountId: account.id,
      categoryId: groceries,
      notes: "Weekly shop",
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      type: "EXPENSE",
      amount: "62.14",
      date: "2026-10-18",
      notes: "Weekly shop",
      account: { id: account.id, name: "Maple Bank" },
      category: { id: groceries, name: "Groceries", group: "NEEDS" },
      incomeSource: null,
    });
  });

  it("adds income with an income source", async () => {
    const { account, salary } = await setUp(alice);
    const { body: source } = await alice.post("/api/income-sources", { name: "Acme" });

    const res = await alice.post("/api/transactions", {
      type: "INCOME",
      amount: "1500",
      date: "2026-10-15",
      accountId: account.id,
      categoryId: salary,
      incomeSourceId: source.id,
    });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe("1500.00");
    expect(res.body.incomeSource).toEqual({ id: source.id, name: "Acme" });
  });

  it("updates the account balance", async () => {
    const { account, groceries, salary } = await setUp(alice);
    const base = { date: "2026-10-18", accountId: account.id };

    await alice.post("/api/transactions", { ...base, type: "EXPENSE", amount: "62.14", categoryId: groceries });
    await alice.post("/api/transactions", { ...base, type: "INCOME", amount: "500", categoryId: salary });

    // 1000.00 − 62.14 + 500.00
    expect(await balanceOf(alice, account.id)).toBe("1437.86");
  });

  it("allows a date on the opening date itself", async () => {
    const { account, groceries } = await setUp(alice);

    const res = await alice.post("/api/transactions", {
      type: "EXPENSE",
      amount: "5",
      date: "2026-10-01",
      accountId: account.id,
      categoryId: groceries,
    });

    expect(res.status).toBe(201);
  });
});

describe("invalid input", () => {
  it.each<[object, string]>([
    [{ amount: "0" }, "zero"],
    [{ amount: "0.00" }, "zero with decimals"],
    [{ amount: "-5" }, "negative"],
    [{ amount: "abc" }, "not a number"],
    [{ amount: "12.345" }, "3 decimals"],
    [{ amount: 12 }, "a number, not a string"],
    [{ amount: "12345678901" }, "too large"],
    [{ date: "2026-02-30" }, "not a real date"],
    [{ date: "Oct 18" }, "date in the wrong format"],
    [{ type: "TRANSFER" }, "transfers aren't supported yet"],
    [{ accountId: "not-an-id" }, "malformed account id"],
    [{ notes: "x".repeat(201) }, "notes too long"],
    [{ userId: "someone-else" }, "sneaking in another user"],
  ])("rejects %o (%s)", async (change) => {
    const { account, groceries } = await setUp(alice);

    const res = await alice.post("/api/transactions", {
      type: "EXPENSE",
      amount: "10",
      date: "2026-10-18",
      accountId: account.id,
      categoryId: groceries,
      ...change,
    });

    expect(res.status).toBe(400);
    expect(await prisma.transaction.count()).toBe(0);
  });

  it("rejects a missing amount", async () => {
    const { account, groceries } = await setUp(alice);

    const res = await alice.post("/api/transactions", {
      type: "EXPENSE",
      date: "2026-10-18",
      accountId: account.id,
      categoryId: groceries,
    });

    expect(res.status).toBe(400);
  });

  it("rejects a date before the account's opening date", async () => {
    const { account, groceries } = await setUp(alice);

    const res = await alice.post("/api/transactions", {
      type: "EXPENSE",
      amount: "10",
      date: "2026-09-30",
      accountId: account.id,
      categoryId: groceries,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/opening date/);
  });
});

describe("categories and income sources must fit", () => {
  it("rejects an income category on an expense", async () => {
    const { account, salary } = await setUp(alice);
    const res = await alice.post("/api/transactions", {
      type: "EXPENSE",
      amount: "10",
      date: "2026-10-18",
      accountId: account.id,
      categoryId: salary,
    });

    expect(res.status).toBe(400);
  });

  it("rejects an expense category on income", async () => {
    const { account, groceries } = await setUp(alice);
    const res = await alice.post("/api/transactions", {
      type: "INCOME",
      amount: "10",
      date: "2026-10-18",
      accountId: account.id,
      categoryId: groceries,
    });

    expect(res.status).toBe(400);
  });

  it("rejects an income source on an expense", async () => {
    const { account, groceries } = await setUp(alice);
    const { body: source } = await alice.post("/api/income-sources", { name: "Acme" });

    const res = await alice.post("/api/transactions", {
      type: "EXPENSE",
      amount: "10",
      date: "2026-10-18",
      accountId: account.id,
      categoryId: groceries,
      incomeSourceId: source.id,
    });

    expect(res.status).toBe(400);
  });
});

describe("archived records can't be used", () => {
  it("rejects an archived account", async () => {
    const { account, groceries } = await setUp(alice);
    await alice.patch(`/api/accounts/${account.id}`, { archived: true });

    const res = await alice.post("/api/transactions", {
      type: "EXPENSE",
      amount: "10",
      date: "2026-10-18",
      accountId: account.id,
      categoryId: groceries,
    });

    expect(res.status).toBe(400);
  });

  it("rejects an archived category", async () => {
    const { account, groceries } = await setUp(alice);
    await alice.patch(`/api/categories/${groceries}`, { archived: true });

    const res = await alice.post("/api/transactions", {
      type: "EXPENSE",
      amount: "10",
      date: "2026-10-18",
      accountId: account.id,
      categoryId: groceries,
    });

    expect(res.status).toBe(400);
  });

  it("rejects an archived income source", async () => {
    const { account, salary } = await setUp(alice);
    const { body: source } = await alice.post("/api/income-sources", { name: "Old job" });
    await alice.patch(`/api/income-sources/${source.id}`, { archived: true });

    const res = await alice.post("/api/transactions", {
      type: "INCOME",
      amount: "10",
      date: "2026-10-18",
      accountId: account.id,
      categoryId: salary,
      incomeSourceId: source.id,
    });

    expect(res.status).toBe(400);
  });
});

describe("listing transactions", () => {
  // Adds an expense straight to the database, so these tests don't depend on
  // the validation rules above
  async function addExpense(account: { id: string }, categoryId: string, date: string) {
    const stored = await prisma.account.findUniqueOrThrow({ where: { id: account.id } });
    return prisma.transaction.create({
      data: {
        type: "EXPENSE",
        amount: "10.00",
        date: new Date(date),
        accountId: account.id,
        categoryId,
        userId: stored.userId,
      },
    });
  }

  it("lists newest first", async () => {
    const { account, groceries } = await setUp(alice);
    await addExpense(account, groceries, "2026-10-05");
    await addExpense(account, groceries, "2026-10-20");

    const res = await alice.get("/api/transactions");

    expect(res.status).toBe(200);
    expect(res.body.map((t: { date: string }) => t.date)).toEqual(["2026-10-20", "2026-10-05"]);
  });

  it("filters by month, including the first and last day", async () => {
    const { account, groceries } = await setUp(alice);
    await addExpense(account, groceries, "2026-10-01");
    await addExpense(account, groceries, "2026-10-31");
    await addExpense(account, groceries, "2026-11-01");

    const { body } = await alice.get("/api/transactions?month=2026-10");

    expect(body.map((t: { date: string }) => t.date)).toEqual(["2026-10-31", "2026-10-01"]);
  });

  it("handles December rolling into the next year", async () => {
    const { account, groceries } = await setUp(alice);
    await addExpense(account, groceries, "2026-12-31");
    await addExpense(account, groceries, "2027-01-01");

    const { body } = await alice.get("/api/transactions?month=2026-12");

    expect(body.map((t: { date: string }) => t.date)).toEqual(["2026-12-31"]);
  });

  it("filters by account and by category", async () => {
    const { account, groceries, rent } = await setUp(alice);
    const { body: other } = await alice.post("/api/accounts", {
      name: "Birch Savings",
      type: "SAVINGS",
      openingBalance: "0",
      openingDate: "2026-10-01",
    });
    await addExpense(account, groceries, "2026-10-05");
    await addExpense(account, rent, "2026-10-06");
    await addExpense(other, groceries, "2026-10-07");

    const byAccount = await alice.get(`/api/transactions?accountId=${other.id}`);
    const byCategory = await alice.get(`/api/transactions?categoryId=${rent}`);

    expect(byAccount.body.map((t: { date: string }) => t.date)).toEqual(["2026-10-07"]);
    expect(byCategory.body.map((t: { date: string }) => t.date)).toEqual(["2026-10-06"]);
  });

  it.each(["month=2026-13", "month=October", "accountId=not-an-id", "categoryId=not-an-id"])(
    "rejects the filter %s",
    async (query) => {
      const res = await alice.get(`/api/transactions?${query}`);

      expect(res.status).toBe(400);
    },
  );
});

describe("data isolation", () => {
  it("never shows one user's transactions to another", async () => {
    const { account, groceries } = await setUp(alice);
    await alice.post("/api/transactions", {
      type: "EXPENSE",
      amount: "10",
      date: "2026-10-18",
      accountId: account.id,
      categoryId: groceries,
    });

    expect((await bob.get("/api/transactions")).body).toEqual([]);
    expect((await bob.get(`/api/transactions?accountId=${account.id}`)).body).toEqual([]);
  });

  it("refuses another user's account, category or income source", async () => {
    const mine = await setUp(alice);
    const theirs = await setUp(bob);
    const { body: theirSource } = await bob.post("/api/income-sources", { name: "Bob's job" });
    const base = { date: "2026-10-18", amount: "10" };

    const account = await alice.post("/api/transactions", {
      ...base,
      type: "EXPENSE",
      accountId: theirs.account.id,
      categoryId: mine.groceries,
    });
    const category = await alice.post("/api/transactions", {
      ...base,
      type: "EXPENSE",
      accountId: mine.account.id,
      categoryId: theirs.groceries,
    });
    const source = await alice.post("/api/transactions", {
      ...base,
      type: "INCOME",
      accountId: mine.account.id,
      categoryId: mine.salary,
      incomeSourceId: theirSource.id,
    });

    expect(account.status).toBe(400);
    expect(category.status).toBe(400);
    expect(source.status).toBe(400);
    expect(await prisma.transaction.count()).toBe(0);
  });
});

// Adds an expense through the API and returns it
async function addExpense(user: ReturnType<typeof as>, accountId: string, categoryId: string) {
  const { body } = await user.post("/api/transactions", {
    type: "EXPENSE",
    amount: "100.00",
    date: "2026-10-18",
    accountId,
    categoryId,
    notes: "Weekly shop",
  });
  return body;
}

describe("editing transactions", () => {
  it("changes the amount and the balance follows", async () => {
    const { account, groceries } = await setUp(alice);
    const tx = await addExpense(alice, account.id, groceries);

    const res = await alice.patch(`/api/transactions/${tx.id}`, { amount: "40.50" });

    expect(res.status).toBe(200);
    expect(res.body.amount).toBe("40.50");
    expect(await balanceOf(alice, account.id)).toBe("959.50"); // 1000 − 40.50
  });

  it("changes the date, category and notes, and can clear the notes", async () => {
    const { account, groceries, rent } = await setUp(alice);
    const tx = await addExpense(alice, account.id, groceries);

    const moved = await alice.patch(`/api/transactions/${tx.id}`, {
      date: "2026-10-20",
      categoryId: rent,
    });
    const cleared = await alice.patch(`/api/transactions/${tx.id}`, { notes: null });

    expect(moved.body).toMatchObject({ date: "2026-10-20", category: { id: rent } });
    expect(cleared.body.notes).toBeNull();
    expect(cleared.body.date).toBe("2026-10-20"); // earlier edit kept
  });

  it("switches an expense to income when the category changes too", async () => {
    const { account, groceries, salary } = await setUp(alice);
    const tx = await addExpense(alice, account.id, groceries);

    const res = await alice.patch(`/api/transactions/${tx.id}`, {
      type: "INCOME",
      categoryId: salary,
    });

    expect(res.status).toBe(200);
    expect(await balanceOf(alice, account.id)).toBe("1100.00"); // 1000 + 100
  });

  it("checks the whole transaction after the change, not just the new fields", async () => {
    const { account, groceries, salary } = await setUp(alice);
    const tx = await addExpense(alice, account.id, groceries);

    // Income with the expense category it already had
    const typeOnly = await alice.patch(`/api/transactions/${tx.id}`, { type: "INCOME" });
    // An income category on what's still an expense
    const categoryOnly = await alice.patch(`/api/transactions/${tx.id}`, { categoryId: salary });

    expect(typeOnly.status).toBe(400);
    expect(categoryOnly.status).toBe(400);
  });

  it("removes an income source when switching income to an expense", async () => {
    const { account, groceries, salary } = await setUp(alice);
    const { body: source } = await alice.post("/api/income-sources", { name: "Acme" });
    const { body: tx } = await alice.post("/api/transactions", {
      type: "INCOME",
      amount: "50",
      date: "2026-10-18",
      accountId: account.id,
      categoryId: salary,
      incomeSourceId: source.id,
    });

    const keepsSource = await alice.patch(`/api/transactions/${tx.id}`, {
      type: "EXPENSE",
      categoryId: groceries,
    });
    const dropsSource = await alice.patch(`/api/transactions/${tx.id}`, {
      type: "EXPENSE",
      categoryId: groceries,
      incomeSourceId: null,
    });

    expect(keepsSource.status).toBe(400);
    expect(dropsSource.status).toBe(200);
    expect(dropsSource.body.incomeSource).toBeNull();
  });

  it("still allows editing after its category or account is archived", async () => {
    const { account, groceries } = await setUp(alice);
    const tx = await addExpense(alice, account.id, groceries);
    await alice.patch(`/api/categories/${groceries}`, { archived: true });
    await alice.patch(`/api/accounts/${account.id}`, { archived: true });

    const res = await alice.patch(`/api/transactions/${tx.id}`, { notes: "Fixed typo" });

    expect(res.status).toBe(200);
    expect(res.body.notes).toBe("Fixed typo");
  });

  it("won't move a transaction onto an archived category", async () => {
    const { account, groceries, rent } = await setUp(alice);
    const tx = await addExpense(alice, account.id, groceries);
    await alice.patch(`/api/categories/${rent}`, { archived: true });

    const res = await alice.patch(`/api/transactions/${tx.id}`, { categoryId: rent });

    expect(res.status).toBe(400);
  });

  it.each<[object, string]>([
    [{ amount: "0" }, "zero amount"],
    [{ amount: "-5" }, "negative amount"],
    [{ date: "2026-09-30" }, "before the account's opening date"],
    [{ date: "2026-02-30" }, "not a real date"],
    [{ type: "TRANSFER" }, "transfers aren't supported yet"],
    [{ userId: "someone-else" }, "sneaking in another user"],
  ])("rejects %o (%s) and leaves it unchanged", async (change) => {
    const { account, groceries } = await setUp(alice);
    const tx = await addExpense(alice, account.id, groceries);

    const res = await alice.patch(`/api/transactions/${tx.id}`, change);

    expect(res.status).toBe(400);
    const stored = await prisma.transaction.findUniqueOrThrow({ where: { id: tx.id } });
    expect(stored.amount.toFixed(2)).toBe("100.00");
    expect(stored.date.toISOString().slice(0, 10)).toBe("2026-10-18");
  });
});

describe("deleting transactions", () => {
  it("deletes a transaction and the balance goes back", async () => {
    const { account, groceries } = await setUp(alice);
    const tx = await addExpense(alice, account.id, groceries);

    const res = await alice.delete(`/api/transactions/${tx.id}`);

    expect(res.status).toBe(204);
    expect(await prisma.transaction.count()).toBe(0);
    expect(await balanceOf(alice, account.id)).toBe("1000.00");
  });

  it("returns 404 for a transaction that doesn't exist", async () => {
    await setUp(alice);

    const res = await alice.delete("/api/transactions/00000000-0000-4000-8000-000000000000");

    expect(res.status).toBe(404);
  });
});

describe("editing and deleting are private", () => {
  it("returns 404 when another user tries to change or delete a transaction", async () => {
    const { account, groceries } = await setUp(alice);
    const tx = await addExpense(alice, account.id, groceries);
    await setUp(bob);

    const edit = await bob.patch(`/api/transactions/${tx.id}`, { amount: "1" });
    const remove = await bob.delete(`/api/transactions/${tx.id}`);

    expect(edit.status).toBe(404);
    expect(remove.status).toBe(404);
    const stored = await prisma.transaction.findUniqueOrThrow({ where: { id: tx.id } });
    expect(stored.amount.toFixed(2)).toBe("100.00");
  });

  it("won't move a transaction onto another user's account", async () => {
    const mine = await setUp(alice);
    const theirs = await setUp(bob);
    const tx = await addExpense(alice, mine.account.id, mine.groceries);

    const res = await alice.patch(`/api/transactions/${tx.id}`, { accountId: theirs.account.id });

    expect(res.status).toBe(400);
  });
});

describe("recent transactions", () => {
  it("sends back only the newest ones when given a limit", async () => {
    const { account, groceries } = await setUp(alice);
    for (const day of ["05", "06", "07"]) {
      await alice.post("/api/transactions", {
        type: "EXPENSE",
        amount: "10",
        date: `2026-10-${day}`,
        accountId: account.id,
        categoryId: groceries,
      });
    }

    const res = await alice.get(`/api/transactions?accountId=${account.id}&limit=2`);

    expect(res.status).toBe(200);
    expect(res.body.map((t: { date: string }) => t.date)).toEqual(["2026-10-07", "2026-10-06"]);
  });

  it.each(["0", "-1", "51", "2.5", "abc"])("rejects limit=%s", async (limit) => {
    const res = await alice.get(`/api/transactions?limit=${limit}`);

    expect(res.status).toBe(400);
  });
});

describe("an account's updated time follows its activity", () => {
  const longAgo = new Date("2026-01-01T00:00:00Z");

  // Pushes accounts' updatedAt into the past so any change is clearly visible
  async function age(...ids: string[]) {
    await prisma.account.updateMany({ where: { id: { in: ids } }, data: { updatedAt: longAgo } });
  }

  async function updatedAtOf(id: string) {
    const account = await prisma.account.findUniqueOrThrow({ where: { id } });
    return account.updatedAt.getTime();
  }

  it("moves forward when a transaction is added", async () => {
    const { account, groceries } = await setUp(alice);
    await age(account.id);

    await addExpense(alice, account.id, groceries);

    expect(await updatedAtOf(account.id)).toBeGreaterThan(longAgo.getTime());
  });

  it("moves forward when a transaction is deleted", async () => {
    const { account, groceries } = await setUp(alice);
    const tx = await addExpense(alice, account.id, groceries);
    await age(account.id);

    await alice.delete(`/api/transactions/${tx.id}`);

    expect(await updatedAtOf(account.id)).toBeGreaterThan(longAgo.getTime());
  });

  it("moves forward on both accounts when a transaction moves between them", async () => {
    const { account, groceries } = await setUp(alice);
    const { body: other } = await alice.post("/api/accounts", {
      name: "Birch Savings",
      type: "SAVINGS",
      openingBalance: "0",
      openingDate: "2026-10-01",
    });
    const tx = await addExpense(alice, account.id, groceries);
    await age(account.id, other.id);

    await alice.patch(`/api/transactions/${tx.id}`, { accountId: other.id });

    expect(await updatedAtOf(account.id)).toBeGreaterThan(longAgo.getTime());
    expect(await updatedAtOf(other.id)).toBeGreaterThan(longAgo.getTime());
  });

  it("isn't changed by a refused transaction", async () => {
    const { account, groceries } = await setUp(alice);
    await age(account.id);

    await alice.post("/api/transactions", {
      type: "EXPENSE",
      amount: "0",
      date: "2026-10-18",
      accountId: account.id,
      categoryId: groceries,
    });

    expect(await updatedAtOf(account.id)).toBe(longAgo.getTime());
  });
});
