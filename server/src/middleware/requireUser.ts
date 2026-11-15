import type { RequestHandler } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { Prisma, type User } from "@prisma/client";
import { prisma } from "../db.js";
import { DEFAULT_CATEGORIES } from "../lib/defaultCategories.js";

// Lets routes use req.user with the right type
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Blocks signed-out requests and attaches our User row to req.user.
// The first time someone signs in, their User row is created from Clerk.
export const requireUser: RequestHandler = async (req, res, next) => {
  const { userId: clerkUserId } = getAuth(req);

  if (!clerkUserId) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }

  let user = await prisma.user.findUnique({ where: { clerkUserId } });

  if (!user) {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const email =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      res.status(400).json({ error: "Your account needs an email address" });
      return;
    }

    try {
      user = await prisma.user.upsert({
        where: { clerkUserId },
        update: {},
        create: {
          clerkUserId,
          email,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          // New users start with the default categories
          categories: { create: DEFAULT_CATEGORIES },
        },
      });
    } catch (err) {
      // Two first requests at once (e.g. a page loading several things): both
      // saw no user and both tried to create one. Because of the nested
      // categories, Prisma's upsert checks then inserts, so one can lose with a
      // unique-constraint error (P2002). The user exists now, so just use it.
      const raced =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!raced) throw err;
      user = await prisma.user.findUniqueOrThrow({ where: { clerkUserId } });
    }
  }

  req.user = user;
  next();
};
