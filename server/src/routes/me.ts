import { Router } from "express";
import { z } from "zod";
import { clerkClient } from "@clerk/express";
import { prisma } from "../db.js";
import { requireUser } from "../middleware/requireUser.js";
import { parseBody } from "../lib/validation.js";

export const meRouter = Router();

// Returns the signed-in user's profile
meRouter.get("/", requireUser, (req, res) => {
  const { id, email, firstName, lastName, createdAt } = req.user!;
  res.json({ id, email, firstName, lastName, createdAt });
});

// The request must say "DELETE", so it can't happen by accident
const deleteSchema = z.strictObject({
  confirm: z.literal("DELETE", { error: "Type DELETE to confirm" }),
});

// Deletes the account for good: every piece of the user's data (accounts,
// transactions, categories and the rest all cascade from the user), then
// their Clerk sign-in. Both happen together: if Clerk can't delete the
// sign-in, the database change is rolled back and nothing is lost, so data
// is never left behind without a way to sign in to it.
meRouter.delete("/", requireUser, async (req, res) => {
  parseBody(deleteSchema, req.body);
  const user = req.user!;

  await prisma.$transaction(async (tx) => {
    await tx.user.delete({ where: { id: user.id } });
    await clerkClient.users.deleteUser(user.clerkUserId);
  });

  res.status(204).end();
});
