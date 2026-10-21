import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "./app.js";

describe("GET /api/health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe("error handler", () => {
  it("returns 400 for invalid JSON", async () => {
    const res = await request(app)
      .post("/api/health")
      .set("Content-Type", "application/json")
      .send("{bad json");

    expect(res.status).toBe(400);
  });
});
