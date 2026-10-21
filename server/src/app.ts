import express, { type ErrorRequestHandler } from "express";
import cors from "cors";

// Creates express app (kept separate from app.listen so tests can use it)
export const app = express();

// Allow requests from the React frontend
app.use(cors({ origin: "http://localhost:5173" }));

// Parse JSON request bodies into req.body
app.use(express.json());

// Quick check that the server is up
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Catch any error thrown in a route and send a safe response
// (must be registered after all routes)
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Client mistakes (e.g. invalid JSON) come with a 4xx status
  if (err.status >= 400 && err.status < 500) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
};
app.use(errorHandler);
