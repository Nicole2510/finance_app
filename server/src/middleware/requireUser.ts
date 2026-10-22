import type { RequestHandler } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import type { User } from "@prisma/client";
import { prisma } from "../db.js";

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

    // upsert (not create) so two requests arriving at once can't
    // both try to create the same user
    user = await prisma.user.upsert({
      where: { clerkUserId },
      update: {},
      create: {
        clerkUserId,
        email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
      },
    });
  }

  req.user = user;
  next();
};
