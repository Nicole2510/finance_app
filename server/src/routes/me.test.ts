import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { prisma } from "../db.js";

// Start each test with an empty luma_test database
beforeEach(async () => {
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/me", () => {
  it("returns 401 when not signed in", async () => {
    const res = await request(app).get("/api/me");

    expect(res.status).toBe(401);
  });

  it("creates the user on first request and returns their profile", async () => {
    const res = await request(app)
      .get("/api/me")
      .set("x-test-clerk-user", "user_a");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      email: "user_a@example.com",
      firstName: "Test",
      lastName: "user_a",
    });
    expect(await prisma.user.count()).toBe(1);
  });

  it("reuses the same user on later requests", async () => {
    const first = await request(app).get("/api/me").set("x-test-clerk-user", "user_a");
    const second = await request(app).get("/api/me").set("x-test-clerk-user", "user_a");

    expect(second.body.id).toBe(first.body.id);
    expect(await prisma.user.count()).toBe(1);
  });

  it("gives a second user their own separate row", async () => {
    const a = await request(app).get("/api/me").set("x-test-clerk-user", "user_a");
    const b = await request(app).get("/api/me").set("x-test-clerk-user", "user_b");

    expect(b.body.id).not.toBe(a.body.id);
    expect(b.body.email).toBe("user_b@example.com");
    expect(await prisma.user.count()).toBe(2);
  });

  it("handles two first requests at the same time without error", async () => {
    const [r1, r2] = await Promise.all([
      request(app).get("/api/me").set("x-test-clerk-user", "user_a"),
      request(app).get("/api/me").set("x-test-clerk-user", "user_a"),
    ]);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(await prisma.user.count()).toBe(1);
  });
});
