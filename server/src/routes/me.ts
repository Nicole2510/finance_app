import { Router } from "express";
import { requireUser } from "../middleware/requireUser.js";

export const meRouter = Router();

// Returns the signed-in user's profile
meRouter.get("/", requireUser, (req, res) => {
  const { id, email, firstName, lastName, createdAt } = req.user!;
  res.json({ id, email, firstName, lastName, createdAt });
});
