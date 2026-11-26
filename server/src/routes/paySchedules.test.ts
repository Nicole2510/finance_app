import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../db.js";
import { as, resetDb } from "../test/helpers.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const alice = as("user_alice");
const bob = as("user_bob");

const biweekly = { startsOn: "2026-11-07", amount: "800.00", frequency: "WEEKS", interval: 2 };

// A user's income source, and the URL of its schedules
async function source(user: ReturnType<typeof as>, name = "Acme") {
  const { body } = await user.post("/api/income-sources", { name });
  return { id: body.id as string, url: `/api/income-sources/${body.id}/schedules` };
}

describe("adding schedules", () => {
  it("starts with no schedules", async () => {
    const { url } = await source(alice);

    const res = await alice.get(url);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("adds an every-2-weeks schedule", async () => {
    const { url } = await source(alice);

    const res = await alice.post(url, { ...biweekly, amount: "800" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      startsOn: "2026-11-07",
      endsOn: null,
      amount: "800.00",
      frequency: "WEEKS",
      interval: 2,
      dayOne: null,
      dayTwo: null,
    });
  });

  it("adds twice-a-month on chosen days, putting the days in order", async () => {
    const { url } = await source(alice);

    const res = await alice.post(url, {
      startsOn: "2026-11-15",
      amount: "850.00",
      frequency: "TWICE_A_MONTH",
      dayOne: 31,
      dayTwo: 15,
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ interval: null, dayOne: 15, dayTwo: 31 });
  });

  it("adds a one-time payment (first and last payday the same)", async () => {
    const { url } = await source(alice);

    const res = await alice.post(url, {
      startsOn: "2026-12-18",
      endsOn: "2026-12-18",
      amount: "500.00",
      frequency: "MONTHS",
      interval: 1,
    });

    expect(res.status).toBe(201);
    expect(res.body.endsOn).toBe("2026-12-18");
  });

  it("lists a source's schedules oldest first", async () => {
    const { url } = await source(alice);
    await alice.post(url, { ...biweekly, startsOn: "2027-01-15", amount: "850.00" });
    await alice.post(url, biweekly);

    const { body } = await alice.get(url);

    expect(body.map((s: { startsOn: string }) => s.startsOn)).toEqual(["2026-11-07", "2027-01-15"]);
  });

  it("refuses a second schedule starting the same day on the same source", async () => {
    const { url } = await source(alice);
    await alice.post(url, biweekly);

    const res = await alice.post(url, { ...biweekly, amount: "900.00" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("This source already has a schedule starting on Nov 7, 2026");
  });

  it("refuses new schedules on an archived source", async () => {
    const { id, url } = await source(alice);
    await alice.patch(`/api/income-sources/${id}`, { archived: true });

    const res = await alice.post(url, biweekly);

    expect(res.status).toBe(409);
  });
});

describe("rules", () => {
  it.each<[object, string]>([
    [{ ...biweekly, amount: "0" }, "a zero amount"],
    [{ ...biweekly, amount: 800 }, "an amount as a number, not a string"],
    [{ ...biweekly, startsOn: "2026-02-30" }, "a date that doesn't exist"],
    [{ ...biweekly, endsOn: "2026-11-01" }, "a last payday before the first"],
    [{ ...biweekly, interval: undefined }, "every N weeks without N"],
    [{ ...biweekly, interval: 53 }, "every 53 weeks"],
    [{ ...biweekly, interval: 1.5 }, "every 1.5 weeks"],
    [{ ...biweekly, frequency: "MONTHS", interval: 13 }, "every 13 months"],
    [{ ...biweekly, frequency: "YEARLY" }, "an unknown frequency"],
    [
      { startsOn: "2026-11-15", amount: "850.00", frequency: "TWICE_A_MONTH", dayOne: 15 },
      "twice a month with one day",
    ],
    [
      {
        startsOn: "2026-11-15",
        amount: "850.00",
        frequency: "TWICE_A_MONTH",
        dayOne: 15,
        dayTwo: 15,
      },
      "twice a month on the same day",
    ],
    [
      {
        startsOn: "2026-11-15",
        amount: "850.00",
        frequency: "TWICE_A_MONTH",
        dayOne: 0,
        dayTwo: 32,
      },
      "twice a month outside 1-31",
    ],
    [{ ...biweekly, userId: "someone-else" }, "an extra field"],
  ])("rejects %o (%s)", async (body) => {
    const { url } = await source(alice);

    const res = await alice.post(url, body);

    expect(res.status).toBe(400);
    expect(await prisma.paySchedule.count()).toBe(0);
  });

  it("explains what's wrong", async () => {
    const { url } = await source(alice);

    const res = await alice.post(url, { ...biweekly, interval: 60 });

    expect(res.body.error).toBe("Choose every 1 to 52 weeks");
  });
});

describe("editing, ending and deleting", () => {
  it("fixes a mistake, e.g. the amount", async () => {
    const { url } = await source(alice);
    const { body: s } = await alice.post(url, biweekly);

    const res = await alice.patch(`${url}/${s.id}`, { amount: "825.50" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ amount: "825.50", interval: 2, startsOn: "2026-11-07" });
  });

  it("ends a schedule by setting its last payday, and can undo that", async () => {
    const { url } = await source(alice);
    const { body: s } = await alice.post(url, biweekly);

    const ended = await alice.patch(`${url}/${s.id}`, { endsOn: "2027-03-12" });
    const reopened = await alice.patch(`${url}/${s.id}`, { endsOn: null });

    expect(ended.body.endsOn).toBe("2027-03-12");
    expect(reopened.body.endsOn).toBeNull();
  });

  it("switching to twice a month clears the interval", async () => {
    const { url } = await source(alice);
    const { body: s } = await alice.post(url, biweekly);

    const res = await alice.patch(`${url}/${s.id}`, {
      frequency: "TWICE_A_MONTH",
      dayOne: 1,
      dayTwo: 15,
    });

    expect(res.body).toMatchObject({
      frequency: "TWICE_A_MONTH",
      interval: null,
      dayOne: 1,
      dayTwo: 15,
    });
  });

  it("checks the whole schedule after an edit", async () => {
    const { url } = await source(alice);
    const { body: s } = await alice.post(url, biweekly);

    const early = await alice.patch(`${url}/${s.id}`, { endsOn: "2026-10-01" });
    const noDays = await alice.patch(`${url}/${s.id}`, { frequency: "TWICE_A_MONTH" });

    expect(early.status).toBe(400);
    expect(noDays.status).toBe(400);
    expect((await alice.get(url)).body[0]).toMatchObject({ endsOn: null, frequency: "WEEKS" });
  });

  it("refuses moving a schedule onto another one's start date", async () => {
    const { url } = await source(alice);
    await alice.post(url, biweekly);
    const { body: later } = await alice.post(url, { ...biweekly, startsOn: "2027-01-15" });

    const res = await alice.patch(`${url}/${later.id}`, { startsOn: "2026-11-07" });

    expect(res.status).toBe(409);
  });

  it("can keep its own start date when other fields change", async () => {
    const { url } = await source(alice);
    const { body: s } = await alice.post(url, biweekly);

    const res = await alice.patch(`${url}/${s.id}`, { startsOn: "2026-11-07", amount: "810.00" });

    expect(res.status).toBe(200);
  });

  it("deletes a schedule", async () => {
    const { url } = await source(alice);
    const { body: s } = await alice.post(url, biweekly);

    const res = await alice.delete(`${url}/${s.id}`);

    expect(res.status).toBe(204);
    expect(await prisma.paySchedule.count()).toBe(0);
  });

  it("deleting an income source deletes its schedules", async () => {
    const { id, url } = await source(alice);
    await alice.post(url, biweekly);

    await alice.delete(`/api/income-sources/${id}`);

    expect(await prisma.paySchedule.count()).toBe(0);
  });

  it("returns 404 for a schedule from a different source", async () => {
    const acme = await source(alice, "Acme");
    const other = await source(alice, "Other");
    const { body: s } = await alice.post(acme.url, biweekly);

    expect((await alice.patch(`${other.url}/${s.id}`, { amount: "1.00" })).status).toBe(404);
    expect((await alice.delete(`${other.url}/${s.id}`)).status).toBe(404);
  });
});

describe("data isolation", () => {
  it("returns 404 when someone uses another user's source or schedule", async () => {
    const { url } = await source(alice);
    const { body: s } = await alice.post(url, biweekly);
    await source(bob);

    expect((await bob.get(url)).status).toBe(404);
    expect((await bob.post(url, { ...biweekly, startsOn: "2026-12-05" })).status).toBe(404);
    expect((await bob.patch(`${url}/${s.id}`, { amount: "1.00" })).status).toBe(404);
    expect((await bob.delete(`${url}/${s.id}`)).status).toBe(404);
    expect((await alice.get(url)).body).toEqual([expect.objectContaining({ amount: "800.00" })]);
  });

  it("returns 404 for a source id that isn't an id", async () => {
    expect((await alice.get("/api/income-sources/not-an-id/schedules")).status).toBe(404);
  });
});
