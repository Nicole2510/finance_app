import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { prisma } from "../db.js";
import { as, resetDb } from "../test/helpers.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

// Every endpoint that needs a signed-in user. When we add new protected
// routes (e.g. accounts in M3), add them here so they're checked too.
// `:category` / `:source` are swapped for real IDs owned by Alice, so a
// passing test proves the request was blocked by sign-in, not a missing ID.
const PROTECTED: [method: "get" | "post" | "patch" | "delete", path: string][] = [
  ["get", "/api/me"],
  ["get", "/api/categories"],
  ["post", "/api/categories"],
  ["patch", "/api/categories/:category"],
  ["delete", "/api/categories/:category"],
  ["get", "/api/income-sources"],
  ["post", "/api/income-sources"],
  ["patch", "/api/income-sources/:source"],
  ["delete", "/api/income-sources/:source"],
];

describe("sign-in protection", () => {
  it.each(PROTECTED)("%s %s returns 401 when signed out", async (method, path) => {
    // Alice has real data that a signed-out request might try to touch
    const alice = as("user_alice");
    const category = await alice.post("/api/categories", { name: "Pets", group: "WANTS" });
    const source = await alice.post("/api/income-sources", { name: "Acme" });
    const before = await snapshot();

    const url = path
      .replace(":category", category.body.id)
      .replace(":source", source.body.id);

    // No x-test-clerk-user header = not signed in
    const res = await request(app)[method](url).send({ name: "Hacked", group: "NEEDS" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Not signed in" });
    // Nothing was created, changed, or deleted
    expect(await snapshot()).toEqual(before);
  });
});

// Everything in the tables we care about, to compare before/after
async function snapshot() {
  const [users, categories, sources] = await Promise.all([
    prisma.user.findMany({ orderBy: { id: "asc" } }),
    prisma.category.findMany({ orderBy: { id: "asc" } }),
    prisma.incomeSource.findMany({ orderBy: { id: "asc" } }),
  ]);
  return { users, categories, sources };
}
