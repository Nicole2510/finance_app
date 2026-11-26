import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../db.js";
import { as, resetDb } from "../test/helpers.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const alice = as("user_alice");
const bob = as("user_bob");

type Row = { id: string; name: string; group: string; budget: string | null; spent: string };

// Gives a user an account (opened Oct 1) and finds some default categories
async function setUp(user: ReturnType<typeof as>) {
  const { body: account } = await user.post("/api/accounts", {
    name: "Maple Bank",
    type: "CHEQUING",
    openingBalance: "1000.00",
    openingDate: "2026-10-01",
  });
  const { body: categories } = await user.get("/api/categories");
  const find = (name: string) => categories.find((c: { name: string }) => c.name === name).id;
  return { account, groceries: find("Groceries"), rent: find("Rent"), salary: find("Salary") };
}

async function spend(
  user: ReturnType<typeof as>,
  accountId: string,
  categoryId: string,
  amount: string,
  date: string,
  type: "EXPENSE" | "INCOME" = "EXPENSE",
) {
  const res = await user.post("/api/transactions", { type, amount, date, accountId, categoryId });
  expect(res.status).toBe(201);
}

async function rowFor(user: ReturnType<typeof as>, month: string, categoryId: string) {
  const { body } = await user.get(`/api/budgets/${month}`);
  return body.categories.find((c: Row) => c.id === categoryId) as Row | undefined;
}

describe("listing a month", () => {
  it("lists every spending category, without budgets yet, and no income ones", async () => {
    await setUp(alice);

    const res = await alice.get("/api/budgets/2026-11");

    expect(res.status).toBe(200);
    expect(res.body.month).toBe("2026-11");
    expect(res.body.categories.length).toBeGreaterThan(0);
    for (const row of res.body.categories as Row[]) {
      expect(row.group).not.toBe("INCOME");
      expect(row.budget).toBeNull();
      expect(row.spent).toBe("0.00");
    }
  });

  it("adds up that month's spending per category, exactly", async () => {
    const { account, groceries } = await setUp(alice);
    await spend(alice, account.id, groceries, "0.10", "2026-11-03");
    await spend(alice, account.id, groceries, "0.20", "2026-11-30");

    expect((await rowFor(alice, "2026-11", groceries))?.spent).toBe("0.30");
  });

  it("leaves out other months, income, and other people's spending", async () => {
    const { account, groceries, salary } = await setUp(alice);
    const bobs = await setUp(bob);
    await spend(alice, account.id, groceries, "50.00", "2026-10-31"); // October
    await spend(alice, account.id, groceries, "40.00", "2026-12-01"); // December
    await spend(alice, account.id, salary, "900.00", "2026-11-05", "INCOME");
    await spend(bob, bobs.account.id, bobs.groceries, "70.00", "2026-11-05");

    expect((await rowFor(alice, "2026-11", groceries))?.spent).toBe("0.00");
  });

  it("counts spending dated before the account's opening date (history is still spending)", async () => {
    const { account, groceries } = await setUp(alice); // opened Oct 1
    await spend(alice, account.id, groceries, "25.00", "2026-09-12");

    expect((await rowFor(alice, "2026-09", groceries))?.spent).toBe("25.00");
  });

  it("hides archived categories unless they have a budget or spending that month", async () => {
    const { account, groceries, rent } = await setUp(alice);
    await alice.put(`/api/budgets/2026-11/${rent}`, { amount: "1200.00" });
    await spend(alice, account.id, groceries, "30.00", "2026-11-04");
    const { body: pets } = await alice.post("/api/categories", { name: "Pets", group: "WANTS" });
    for (const id of [groceries, rent, pets.id]) {
      await alice.patch(`/api/categories/${id}`, { archived: true });
    }

    expect(await rowFor(alice, "2026-11", rent)).toMatchObject({ budget: "1200.00" });
    expect(await rowFor(alice, "2026-11", groceries)).toMatchObject({ spent: "30.00" });
    expect(await rowFor(alice, "2026-11", pets.id)).toBeUndefined();
    expect(await rowFor(alice, "2026-12", rent)).toBeUndefined(); // nothing in December
  });

  it.each(["2026-13", "2026-1", "nov", "2026-11-01"])("rejects the month %s", async (month) => {
    const res = await alice.get(`/api/budgets/${month}`);

    expect(res.status).toBe(400);
  });
});

describe("setting a budget", () => {
  it("sets a budget and shows it for that month only", async () => {
    const { groceries } = await setUp(alice);

    const res = await alice.put(`/api/budgets/2026-11/${groceries}`, { amount: "450" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ categoryId: groceries, month: "2026-11", amount: "450.00" });
    expect((await rowFor(alice, "2026-11", groceries))?.budget).toBe("450.00");
    expect((await rowFor(alice, "2026-12", groceries))?.budget).toBeNull();
  });

  it("changing it updates the same budget instead of adding another", async () => {
    const { groceries } = await setUp(alice);
    await alice.put(`/api/budgets/2026-11/${groceries}`, { amount: "450.00" });

    await alice.put(`/api/budgets/2026-11/${groceries}`, { amount: "500.25" });

    expect((await rowFor(alice, "2026-11", groceries))?.budget).toBe("500.25");
    expect(await prisma.budget.count()).toBe(1);
  });

  it.each<[object, string]>([
    [{ amount: "0" }, "zero"],
    [{ amount: "-50.00" }, "negative"],
    [{ amount: "12.345" }, "three decimals"],
    [{ amount: 450 }, "a number, not a string"],
    [{}, "missing"],
    [{ amount: "450.00", userId: "someone-else" }, "an extra field"],
  ])("rejects an amount that is %o (%s)", async (body) => {
    const { groceries } = await setUp(alice);

    const res = await alice.put(`/api/budgets/2026-11/${groceries}`, body);

    expect(res.status).toBe(400);
    expect(await prisma.budget.count()).toBe(0);
  });

  it("refuses income categories", async () => {
    const { salary } = await setUp(alice);

    const res = await alice.put(`/api/budgets/2026-11/${salary}`, { amount: "100.00" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/spending/i);
  });

  it("refuses archived categories", async () => {
    const { groceries } = await setUp(alice);
    await alice.patch(`/api/categories/${groceries}`, { archived: true });

    const res = await alice.put(`/api/budgets/2026-11/${groceries}`, { amount: "100.00" });

    expect(res.status).toBe(409);
  });

  it("returns 404 for a category that doesn't exist or isn't an id", async () => {
    await setUp(alice);

    const missing = await alice.put("/api/budgets/2026-11/00000000-0000-4000-8000-000000000000", {
      amount: "100.00",
    });
    const garbage = await alice.put("/api/budgets/2026-11/not-an-id", { amount: "100.00" });

    expect(missing.status).toBe(404);
    expect(garbage.status).toBe(404);
  });
});

describe("removing a budget", () => {
  it("removes it, leaving the category without a budget", async () => {
    const { groceries } = await setUp(alice);
    await alice.put(`/api/budgets/2026-11/${groceries}`, { amount: "450.00" });

    const res = await alice.delete(`/api/budgets/2026-11/${groceries}`);

    expect(res.status).toBe(204);
    expect((await rowFor(alice, "2026-11", groceries))?.budget).toBeNull();
    expect(await prisma.budget.count()).toBe(0);
  });

  it("is fine when there was no budget to remove", async () => {
    const { groceries } = await setUp(alice);

    expect((await alice.delete(`/api/budgets/2026-11/${groceries}`)).status).toBe(204);
  });

  it("deleting a category deletes its budgets", async () => {
    const { body: pets } = await alice.post("/api/categories", { name: "Pets", group: "WANTS" });
    await alice.put(`/api/budgets/2026-11/${pets.id}`, { amount: "60.00" });

    await alice.delete(`/api/categories/${pets.id}`);

    expect(await prisma.budget.count()).toBe(0);
  });
});

describe("copying last month", () => {
  it("copies last month's budgets, keeping any already set this month", async () => {
    const { groceries, rent } = await setUp(alice);
    await alice.put(`/api/budgets/2026-10/${groceries}`, { amount: "400.00" });
    await alice.put(`/api/budgets/2026-10/${rent}`, { amount: "1200.00" });
    await alice.put(`/api/budgets/2026-11/${rent}`, { amount: "1250.00" }); // already set

    const res = await alice.post("/api/budgets/2026-11/copy-previous");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ copied: 1 });
    expect((await rowFor(alice, "2026-11", groceries))?.budget).toBe("400.00");
    expect((await rowFor(alice, "2026-11", rent))?.budget).toBe("1250.00");
  });

  it("copies across a new year (January copies from December)", async () => {
    const { groceries } = await setUp(alice);
    await alice.put(`/api/budgets/2026-12/${groceries}`, { amount: "400.00" });

    await alice.post("/api/budgets/2027-01/copy-previous");

    expect((await rowFor(alice, "2027-01", groceries))?.budget).toBe("400.00");
  });

  it("leaves out categories archived since", async () => {
    const { groceries } = await setUp(alice);
    await alice.put(`/api/budgets/2026-10/${groceries}`, { amount: "400.00" });
    await alice.patch(`/api/categories/${groceries}`, { archived: true });

    const res = await alice.post("/api/budgets/2026-11/copy-previous");

    expect(res.body).toEqual({ copied: 0 });
  });

  it("copies nothing when last month had no budgets", async () => {
    await setUp(alice);

    expect((await alice.post("/api/budgets/2026-11/copy-previous")).body).toEqual({ copied: 0 });
  });
});

describe("spending history", () => {
  it("totals each of the last 6 months, oldest first, including empty months", async () => {
    const { account, groceries, rent } = await setUp(alice);
    await spend(alice, account.id, groceries, "0.10", "2026-11-02");
    await spend(alice, account.id, rent, "0.20", "2026-11-28");
    await spend(alice, account.id, groceries, "45.00", "2026-09-15");

    const res = await alice.get("/api/budgets/2026-11/history");

    expect(res.status).toBe(200);
    expect(res.body.months).toEqual([
      { month: "2026-06", spent: "0.00" },
      { month: "2026-07", spent: "0.00" },
      { month: "2026-08", spent: "0.00" },
      { month: "2026-09", spent: "45.00" },
      { month: "2026-10", spent: "0.00" },
      { month: "2026-11", spent: "0.30" },
    ]);
  });

  it("crosses into last year and ignores income, later months and other users", async () => {
    const { account, groceries, salary } = await setUp(alice);
    const bobs = await setUp(bob);
    await spend(alice, account.id, groceries, "20.00", "2025-12-31");
    await spend(alice, account.id, salary, "900.00", "2026-01-05", "INCOME");
    await spend(alice, account.id, groceries, "99.00", "2026-03-01"); // after the range
    await spend(bob, bobs.account.id, bobs.groceries, "70.00", "2026-01-05");

    const { body } = await alice.get("/api/budgets/2026-02/history");

    expect(body.months.map((m: { month: string }) => m.month)).toEqual([
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
    expect(body.months.find((m: { month: string }) => m.month === "2025-12").spent).toBe("20.00");
    expect(body.months.find((m: { month: string }) => m.month === "2026-01").spent).toBe("0.00");
  });

  it("rejects a bad month", async () => {
    expect((await alice.get("/api/budgets/2026-13/history")).status).toBe(400);
  });
});

describe("income for the month", () => {
  // An income source with one pay schedule
  async function paidBy(user: ReturnType<typeof as>, name: string, schedule: object) {
    const { body } = await user.post("/api/income-sources", { name });
    const res = await user.post(`/api/income-sources/${body.id}/schedules`, schedule);
    expect(res.status).toBe(201);
    return body.id as string;
  }

  const biweekly = { startsOn: "2026-01-02", amount: "800.00", frequency: "WEEKS", interval: 2 };

  it("has no income before any schedules or income", async () => {
    await setUp(alice);

    const { body } = await alice.get("/api/budgets/2026-01");

    expect(body.income).toEqual({ expected: "0.00", received: "0.00", paydays: [] });
  });

  it("expects every payday in the month, including a 3-paycheque month", async () => {
    await setUp(alice);
    await paidBy(alice, "Acme", biweekly);

    const january = (await alice.get("/api/budgets/2026-01")).body.income;
    const february = (await alice.get("/api/budgets/2026-02")).body.income;

    expect(january.expected).toBe("2400.00");
    expect(january.paydays).toEqual([
      { date: "2026-01-02", amount: "800.00", source: "Acme" },
      { date: "2026-01-16", amount: "800.00", source: "Acme" },
      { date: "2026-01-30", amount: "800.00", source: "Acme" },
    ]);
    expect(february.expected).toBe("1600.00");
  });

  it("adds up several income sources, each with its own schedules", async () => {
    await setUp(alice);
    const acme = await paidBy(alice, "Acme", biweekly);
    // A raise at Acme from Feb 13, and a side job paid monthly
    await alice.post(`/api/income-sources/${acme}/schedules`, {
      ...biweekly,
      startsOn: "2026-02-13",
      amount: "850.00",
    });
    await paidBy(alice, "Side job", {
      startsOn: "2026-01-20",
      amount: "120.50",
      frequency: "MONTHS",
      interval: 1,
    });

    const { body } = await alice.get("/api/budgets/2026-02");

    expect(body.income.expected).toBe("1820.50"); // 850 + 120.50 + 850
    expect(body.income.paydays.map((p: { source: string }) => p.source)).toEqual([
      "Acme",
      "Side job",
      "Acme",
    ]);
  });

  it("counts received income from income transactions, separately from expected", async () => {
    const { account, salary, groceries } = await setUp(alice);
    await paidBy(alice, "Acme", biweekly);
    await spend(alice, account.id, salary, "800.00", "2026-02-13", "INCOME");
    await spend(alice, account.id, salary, "0.10", "2026-02-20", "INCOME");
    await spend(alice, account.id, salary, "0.20", "2026-02-27", "INCOME");
    await spend(alice, account.id, groceries, "50.00", "2026-02-14"); // spending isn't income
    await spend(alice, account.id, salary, "900.00", "2026-03-13", "INCOME"); // next month

    const { body } = await alice.get("/api/budgets/2026-02");

    expect(body.income.received).toBe("800.30");
    expect(body.income.expected).toBe("1600.00"); // unchanged by what was received
  });

  it("is fine when more is received than expected", async () => {
    const { account, salary } = await setUp(alice);
    await paidBy(alice, "Acme", biweekly);
    await spend(alice, account.id, salary, "1900.00", "2026-02-13", "INCOME");

    const { body } = await alice.get("/api/budgets/2026-02");

    expect(body.income).toMatchObject({ expected: "1600.00", received: "1900.00" });
  });

  it("only counts your own schedules and income", async () => {
    await setUp(alice);
    const bobs = await setUp(bob);
    await paidBy(bob, "Bob's work", biweekly);
    await spend(bob, bobs.account.id, bobs.salary, "800.00", "2026-02-13", "INCOME");

    const { body } = await alice.get("/api/budgets/2026-02");

    expect(body.income).toEqual({ expected: "0.00", received: "0.00", paydays: [] });
  });
});

describe("budget plan", () => {
  const plan = { needsPct: 50, wantsPct: 30, savingsPct: 20 };

  it("has no plan until one is saved", async () => {
    const res = await alice.get("/api/budgets/2026-11/plan");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ plan: null });
  });

  it("saves a plan and shows it for that month", async () => {
    const res = await alice.put("/api/budgets/2026-11/plan", plan);

    expect(res.status).toBe(200);
    expect(res.body.plan).toEqual({ from: "2026-11", ...plan });
    expect((await alice.get("/api/budgets/2026-11/plan")).body.plan).toEqual({
      from: "2026-11",
      ...plan,
    });
  });

  it("carries forward to later months, but not to earlier ones", async () => {
    await alice.put("/api/budgets/2026-11/plan", plan);

    expect((await alice.get("/api/budgets/2027-03/plan")).body.plan).toMatchObject({
      from: "2026-11",
      needsPct: 50,
    });
    expect((await alice.get("/api/budgets/2026-10/plan")).body.plan).toBeNull();
  });

  it("changing it in a later month starts a new plan and leaves earlier months alone", async () => {
    await alice.put("/api/budgets/2026-11/plan", plan);

    await alice.put("/api/budgets/2027-01/plan", {
      needsPct: 60,
      wantsPct: 30,
      savingsPct: 10,
    });

    expect((await alice.get("/api/budgets/2026-12/plan")).body.plan).toEqual({
      from: "2026-11",
      ...plan,
    });
    expect((await alice.get("/api/budgets/2027-02/plan")).body.plan).toEqual({
      from: "2027-01",
      needsPct: 60,
      wantsPct: 30,
      savingsPct: 10,
    });
    expect(await prisma.budgetPlan.count()).toBe(2);
  });

  it("saving again in the same month updates that plan", async () => {
    await alice.put("/api/budgets/2026-11/plan", plan);

    await alice.put("/api/budgets/2026-11/plan", { needsPct: 40, wantsPct: 30, savingsPct: 30 });

    expect((await alice.get("/api/budgets/2026-11/plan")).body.plan.needsPct).toBe(40);
    expect(await prisma.budgetPlan.count()).toBe(1);
  });

  it.each<[object, string]>([
    [{ ...plan, needsPct: 60 }, "shares adding up to 110"],
    [{ ...plan, needsPct: 120, wantsPct: -10, savingsPct: -10 }, "a share outside 0-100"],
    [{ ...plan, needsPct: 49.5, wantsPct: 30.5 }, "a share with decimals"],
    [{ ...plan, needsPct: "50" }, "a share as a string, not a number"],
    [{ needsPct: 50 }, "missing shares"],
    [{ ...plan, netPay: "1600.00" }, "net pay, which now comes from pay schedules"],
    [{ ...plan, userId: "someone-else" }, "an extra field"],
  ])("rejects %o (%s)", async (body) => {
    const res = await alice.put("/api/budgets/2026-11/plan", body);

    expect(res.status).toBe(400);
    expect(await prisma.budgetPlan.count()).toBe(0);
  });

  it("rejects a bad month", async () => {
    expect((await alice.get("/api/budgets/2026-13/plan")).status).toBe(400);
    expect((await alice.put("/api/budgets/2026-13/plan", plan)).status).toBe(400);
  });

  it("keeps each user's plan to themselves", async () => {
    await alice.put("/api/budgets/2026-11/plan", plan);
    await bob.put("/api/budgets/2026-11/plan", { needsPct: 60, wantsPct: 30, savingsPct: 10 });

    expect((await alice.get("/api/budgets/2026-11/plan")).body.plan.needsPct).toBe(50);
    expect((await bob.get("/api/budgets/2026-11/plan")).body.plan.needsPct).toBe(60);
    expect((await as("user_carol").get("/api/budgets/2026-11/plan")).body.plan).toBeNull();
  });
});

describe("data isolation", () => {
  it("never shows one user's budgets to another", async () => {
    const { groceries } = await setUp(alice);
    const bobs = await setUp(bob);
    await alice.put(`/api/budgets/2026-11/${groceries}`, { amount: "450.00" });

    const { body } = await bob.get("/api/budgets/2026-11");

    expect(body.categories.every((c: Row) => c.budget === null)).toBe(true);
    expect(body.categories.some((c: Row) => c.id === groceries)).toBe(false);
    expect((await rowFor(bob, "2026-11", bobs.groceries))?.budget).toBeNull();
  });

  it("returns 404 when someone sets or removes a budget on another user's category", async () => {
    const { groceries } = await setUp(alice);
    await setUp(bob);
    await alice.put(`/api/budgets/2026-11/${groceries}`, { amount: "450.00" });

    const set = await bob.put(`/api/budgets/2026-11/${groceries}`, { amount: "1.00" });
    const remove = await bob.delete(`/api/budgets/2026-11/${groceries}`);

    expect(set.status).toBe(404);
    expect(remove.status).toBe(404);
    expect((await rowFor(alice, "2026-11", groceries))?.budget).toBe("450.00");
  });

  it("copying only copies your own budgets", async () => {
    const { groceries } = await setUp(alice);
    await setUp(bob);
    await alice.put(`/api/budgets/2026-10/${groceries}`, { amount: "400.00" });

    expect((await bob.post("/api/budgets/2026-11/copy-previous")).body).toEqual({ copied: 0 });
  });
});
