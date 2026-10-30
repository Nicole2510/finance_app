import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { meRouter } from "./routes/me.js";
import { categoriesRouter } from "./routes/categories.js";
import { incomeSourcesRouter } from "./routes/incomeSources.js";
import { accountsRouter } from "./routes/accounts.js";

// Creates express app (kept separate from app.listen so tests can use it)
export const app = express();

// Allow requests from the React frontend
app.use(cors({ origin: "http://localhost:5173" }));

// Parse JSON request bodies into req.body
app.use(express.json());

// Reads the Clerk session token (if any) so getAuth(req) works in routes
app.use(clerkMiddleware());

// Quick check that the server is up
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/me", meRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/income-sources", incomeSourcesRouter);
app.use("/api/accounts", accountsRouter);

// Catch any error thrown in a route and send a safe response
// (must be registered after all routes)
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Client mistakes (e.g. invalid JSON, HttpError) come with a 4xx status
  if (err.status >= 400 && err.status < 500) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  // Prisma unique-constraint error: two requests raced to use the same name
  if (err.code === "P2002") {
    res.status(409).json({ error: "That name is already taken" });
    return;
  }

  // Prisma foreign-key error: a transaction started using the item mid-delete
  if (err.code === "P2003") {
    res.status(409).json({ error: "This item is in use, so it can't be deleted" });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
};
app.use(errorHandler);
