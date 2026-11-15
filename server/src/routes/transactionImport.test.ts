import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../db.js";
import { as, resetDb } from "../test/helpers.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const alice = as("user_alice");
const bob = as("user_bob");

type Category = { id: string; name: string };

// An account opened Oct 1 with $1000, plus the default categories
async function setUp(user: ReturnType<typeof as> = alice) {
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

const send = (mode: "preview" | "import", rows: object[], user = alice) =>
  user.post("/api/transactions/import", { mode, rows });

describe("preview", () => {
  it("reports every row as ready and saves nothing", async () => {
    const { account, groceries, salary } = await setUp();
    const rows = [
      {
        type: "EXPENSE",
        amount: "62.14",
        date: "2026-10-18",
        accountId: account.id,
        categoryId: groceries,
      },
      {
        type: "INCOME",
        amount: "1500",
        date: "2026-10-15",
        accountId: account.id,
        categoryId: salary,
      },
    ];

    const res = await send("preview", rows);

    expect(res.status).toBe(200);
    expect(res.body.rows).toEqual([
      { index: 0, status: "ready" },
      { index: 1, status: "ready" },
    ]);
    expect(res.body.summary).toEqual({ ready: 2, problems: 0, duplicates: 0 });
    expect(await prisma.transaction.count()).toBe(0);
  });

  it("explains each problem row, with the same rules as adding by hand", async () => {
    const { account, groceries, salary } = await setUp();
    const base = {
      type: "EXPENSE",
      amount: "10",
      date: "2026-10-18",
      accountId: account.id,
      categoryId: groceries,
    };

    const res = await send("preview", [
      base,
      { ...base, amount: "0" },
      { ...base, amount: "abc" },
      { ...base, categoryId: salary },
      { ...base, date: "2026-09-30" },
      { ...base, date: "2026-02-30" },
    ]);

    const statuses = res.body.rows.map((r: { status: string }) => r.status);
    // Before the opening date is fine: it's kept as history
    expect(statuses).toEqual(["ready", "problem", "problem", "problem", "ready", "problem"]);
    expect(res.body.rows[3].message).toMatch(/doesn't match/);
    expect(res.body.summary).toEqual({ ready: 2, problems: 4, duplicates: 0 });
  });

  it("treats archived and other users' records as problems", async () => {
    const mine = await setUp();
    const theirs = await setUp(bob);
    await alice.patch(`/api/categories/${mine.rent}`, { archived: true });
    const base = { type: "EXPENSE", amount: "10", date: "2026-10-18", accountId: mine.account.id };

    const res = await send("preview", [
      { ...base, categoryId: mine.rent },
      { ...base, categoryId: theirs.groceries },
      { ...base, categoryId: mine.groceries, accountId: theirs.account.id },
    ]);

    expect(res.body.rows.map((r: { status: string }) => r.status)).toEqual([
      "problem",
      "problem",
      "problem",
    ]);
  });
});

describe("duplicates", () => {
  it("flags a row that matches a transaction you already have", async () => {
    const { account, groceries } = await setUp();
    await alice.post("/api/transactions", {
      type: "EXPENSE",
      amount: "62.14",
      date: "2026-10-18",
      accountId: account.id,
      categoryId: groceries,
    });

    const res = await send("preview", [
      {
        type: "EXPENSE",
        amount: "62.14",
        date: "2026-10-18",
        accountId: account.id,
        categoryId: groceries,
      },
    ]);

    expect(res.body.rows[0].status).toBe("duplicate");
    expect(res.body.summary.duplicates).toBe(1);
  });

  it("flags the second of two identical rows in the same file", async () => {
    const { account, groceries } = await setUp();
    const row = {
      type: "EXPENSE",
      amount: "5",
      date: "2026-10-18",
      accountId: account.id,
      categoryId: groceries,
    };

    const res = await send("preview", [row, row]);

    expect(res.body.rows.map((r: { status: string }) => r.status)).toEqual(["ready", "duplicate"]);
  });

  it("treats 12, 12.0 and 12.00 as the same amount", async () => {
    const { account, groceries } = await setUp();
    const row = {
      type: "EXPENSE",
      date: "2026-10-18",
      accountId: account.id,
      categoryId: groceries,
    };

    const res = await send("preview", [
      { ...row, amount: "12" },
      { ...row, amount: "12.0" },
      { ...row, amount: "12.00" },
    ]);

    expect(res.body.rows.map((r: { status: string }) => r.status)).toEqual([
      "ready",
      "duplicate",
      "duplicate",
    ]);
  });

  it("doesn't flag rows that differ in any part", async () => {
    const { account, groceries, rent } = await setUp();
    const row = {
      type: "EXPENSE",
      amount: "5",
      date: "2026-10-18",
      accountId: account.id,
      categoryId: groceries,
    };

    const res = await send("preview", [
      row,
      { ...row, amount: "6" },
      { ...row, date: "2026-10-19" },
      { ...row, categoryId: rent },
    ]);

    expect(res.body.summary).toEqual({ ready: 4, problems: 0, duplicates: 0 });
  });
});

describe("import", () => {
  it("saves every row and updates the balance", async () => {
    const { account, groceries, salary } = await setUp();

    const res = await send("import", [
      {
        type: "EXPENSE",
        amount: "62.14",
        date: "2026-10-18",
        accountId: account.id,
        categoryId: groceries,
        notes: "Weekly shop",
      },
      {
        type: "INCOME",
        amount: "500",
        date: "2026-10-15",
        accountId: account.id,
        categoryId: salary,
      },
    ]);

    expect(res.status).toBe(201);
    expect(res.body.imported).toBe(2);
    const { body } = await alice.get("/api/accounts");
    expect(body[0].currentBalance).toBe("1437.86"); // 1000 − 62.14 + 500
  });

  it("saves nothing if any row has a problem", async () => {
    const { account, groceries } = await setUp();
    const row = {
      type: "EXPENSE",
      amount: "5",
      date: "2026-10-18",
      accountId: account.id,
      categoryId: groceries,
    };

    const res = await send("import", [row, { ...row, amount: "-1" }]);

    expect(res.status).toBe(400);
    expect(res.body.rows[1].status).toBe("problem");
    expect(await prisma.transaction.count()).toBe(0);
  });

  it("saves duplicates the person chose to keep", async () => {
    const { account, groceries } = await setUp();
    const row = {
      type: "EXPENSE",
      amount: "5",
      date: "2026-10-18",
      accountId: account.id,
      categoryId: groceries,
    };

    const res = await send("import", [row, row]);

    expect(res.status).toBe(201);
    expect(await prisma.transaction.count()).toBe(2);
  });

  it("marks the imported accounts as updated", async () => {
    const { account, groceries } = await setUp();
    const longAgo = new Date("2026-01-01T00:00:00Z");
    await prisma.account.update({ where: { id: account.id }, data: { updatedAt: longAgo } });

    await send("import", [
      {
        type: "EXPENSE",
        amount: "5",
        date: "2026-10-18",
        accountId: account.id,
        categoryId: groceries,
      },
    ]);

    const stored = await prisma.account.findUniqueOrThrow({ where: { id: account.id } });
    expect(stored.updatedAt.getTime()).toBeGreaterThan(longAgo.getTime());
  });
});

describe("invalid requests", () => {
  it.each<[object, string]>([
    [{ mode: "preview", rows: [] }, "no rows"],
    [{ mode: "preview", rows: Array.from({ length: 2001 }, () => ({})) }, "too many rows"],
    [{ rows: [{}] }, "missing mode"],
    [{ mode: "everything", rows: [{}] }, "unknown mode"],
    [{ mode: "preview", rows: [{}], userId: "x" }, "sneaking in another user"],
  ])("rejects %s", async (body) => {
    const res = await alice.post("/api/transactions/import", body);

    expect(res.status).toBe(400);
  });

  it("won't import adjustments or extra fields", async () => {
    const { account, groceries } = await setUp();

    const res = await send("preview", [
      { type: "ADJUSTMENT", amount: "5", date: "2026-10-18", accountId: account.id },
      {
        type: "EXPENSE",
        amount: "5",
        date: "2026-10-18",
        accountId: account.id,
        categoryId: groceries,
        userId: "x",
      },
    ]);

    expect(res.body.rows.map((r: { status: string }) => r.status)).toEqual(["problem", "problem"]);
  });
});
