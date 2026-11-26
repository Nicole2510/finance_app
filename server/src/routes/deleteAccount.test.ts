import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { clerkClient } from "@clerk/express";
import { prisma } from "../db.js";
import { as, resetDb } from "../test/helpers.js";

beforeEach(async () => {
  await resetDb();
  vi.mocked(clerkClient.users.deleteUser).mockClear();
});
afterAll(() => prisma.$disconnect());

const alice = as("user_alice");
const bob = as("user_bob");

// A user with one of everything: an account, a category, an income source and
// transactions using them
async function fullUser(user: ReturnType<typeof as>) {
  const { body: account } = await user.post("/api/accounts", {
    name: "Maple Bank",
    type: "CHEQUING",
    openingBalance: "1000.00",
    openingDate: "2026-10-01",
  });
  const { body: categories } = await user.get("/api/categories");
  const salary = categories.find((c: { name: string }) => c.name === "Salary").id;
  const groceries = categories.find((c: { name: string }) => c.name === "Groceries").id;
  const { body: source } = await user.post("/api/income-sources", { name: "Acme" });
  await user.post("/api/transactions", {
    type: "EXPENSE",
    amount: "50.00",
    date: "2026-10-05",
    accountId: account.id,
    categoryId: groceries,
  });
  await user.post("/api/transactions", {
    type: "INCOME",
    amount: "800.00",
    date: "2026-10-09",
    accountId: account.id,
    categoryId: salary,
    incomeSourceId: source.id,
  });
}

async function countsFor(clerkUserId: string) {
  const user = await prisma.user.findUnique({ where: { clerkUserId } });
  const where = { userId: user?.id ?? "none" };
  return {
    user: user ? 1 : 0,
    accounts: await prisma.account.count({ where }),
    categories: await prisma.category.count({ where }),
    sources: await prisma.incomeSource.count({ where }),
    transactions: await prisma.transaction.count({ where }),
  };
}

describe("deleting your account", () => {
  it("deletes every piece of your data and your sign-in", async () => {
    await fullUser(alice);

    const res = await alice.delete("/api/me").send({ confirm: "DELETE" });

    expect(res.status).toBe(204);
    expect(await countsFor("user_alice")).toEqual({
      user: 0,
      accounts: 0,
      categories: 0,
      sources: 0,
      transactions: 0,
    });
    expect(clerkClient.users.deleteUser).toHaveBeenCalledWith("user_alice");
  });

  it("leaves other people's data alone", async () => {
    await fullUser(alice);
    await fullUser(bob);
    const before = await countsFor("user_bob");

    await alice.delete("/api/me").send({ confirm: "DELETE" });

    expect(await countsFor("user_bob")).toEqual(before);
  });

  it.each<[object | undefined, string]>([
    [undefined, "no confirmation"],
    [{ confirm: "delete" }, "lower case"],
    [{ confirm: "yes" }, "the wrong word"],
    [{ confirm: "DELETE", userId: "someone-else" }, "an extra field"],
  ])("refuses %o (%s) and deletes nothing", async (body) => {
    await fullUser(alice);
    const before = await countsFor("user_alice");

    const res = await alice.delete("/api/me").send(body);

    expect(res.status).toBe(400);
    expect(await countsFor("user_alice")).toEqual(before);
    expect(clerkClient.users.deleteUser).not.toHaveBeenCalled();
  });

  it("keeps all your data if the sign-in can't be deleted", async () => {
    await fullUser(alice);
    const before = await countsFor("user_alice");
    vi.mocked(clerkClient.users.deleteUser).mockRejectedValueOnce(new Error("Clerk is down"));

    const res = await alice.delete("/api/me").send({ confirm: "DELETE" });

    expect(res.status).toBe(500);
    expect(await countsFor("user_alice")).toEqual(before);
  });

  it("needs you to be signed in", async () => {
    await fullUser(alice);
    const { default: request } = await import("supertest");
    const { app } = await import("../app.js");

    const res = await request(app).delete("/api/me").send({ confirm: "DELETE" });

    expect(res.status).toBe(401);
    expect((await countsFor("user_alice")).user).toBe(1);
  });
});
