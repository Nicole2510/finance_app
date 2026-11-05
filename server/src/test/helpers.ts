import request from "supertest";
import { app } from "../app.js";
import { prisma } from "../db.js";

// Empties every table in luma_test (children before parents)
export async function resetDb() {
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany();
  await prisma.category.deleteMany();
  await prisma.incomeSource.deleteMany();
  await prisma.user.deleteMany();
}

// Creates a valid account directly in the database, for tests that
// just need one to exist (e.g. to attach a transaction to)
export function createTestAccount(userId: string) {
  return prisma.account.create({
    data: {
      name: "Chequing",
      type: "CHEQUING",
      openingDate: new Date("2026-01-01"),
      userId,
    },
  });
}

// Makes API requests "signed in" as the given fake Clerk user
export function as(clerkUserId: string) {
  const auth = (r: request.Test) => r.set("x-test-clerk-user", clerkUserId);

  return {
    get: (url: string) => auth(request(app).get(url)),
    post: (url: string, body?: object) => auth(request(app).post(url)).send(body),
    patch: (url: string, body?: object) => auth(request(app).patch(url)).send(body),
    delete: (url: string) => auth(request(app).delete(url)),
  };
}
