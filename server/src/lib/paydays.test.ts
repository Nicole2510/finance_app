import { describe, it, expect } from "vitest";
import { paydaysIn, type Schedule } from "./paydays.js";

const date = (value: string) => new Date(`${value}T00:00:00Z`);

function schedule(starts: string, fields: Partial<Schedule> = {}): Schedule {
  return {
    startsOn: date(starts),
    endsOn: null,
    amount: "800.00",
    frequency: "WEEKS",
    interval: 2,
    dayOne: null,
    dayTwo: null,
    ...fields,
  };
}

const datesOf = (schedules: Schedule[], month: string) =>
  paydaysIn(schedules, month).map((p) => p.date);

describe("every N weeks", () => {
  // Fridays every two weeks, starting Friday Jan 2, 2026
  const biweekly = schedule("2026-01-02");

  it("gives three paydays in a 3-paycheque month", () => {
    expect(datesOf([biweekly], "2026-01")).toEqual(["2026-01-02", "2026-01-16", "2026-01-30"]);
  });

  it("gives two paydays in a usual month", () => {
    expect(datesOf([biweekly], "2026-02")).toEqual(["2026-02-13", "2026-02-27"]);
  });

  it("keeps the two-week rhythm far into the future", () => {
    // 2027-01-01 is 52 weeks after 2026-01-02
    expect(datesOf([biweekly], "2027-01")).toEqual(["2027-01-01", "2027-01-15", "2027-01-29"]);
  });

  it("has nothing before the first payday", () => {
    expect(datesOf([biweekly], "2025-12")).toEqual([]);
  });

  it("starts partway through a month", () => {
    expect(datesOf([schedule("2026-03-20")], "2026-03")).toEqual(["2026-03-20"]);
  });

  it("does weekly pay", () => {
    expect(datesOf([schedule("2026-03-05", { interval: 1 })], "2026-03")).toEqual([
      "2026-03-05",
      "2026-03-12",
      "2026-03-19",
      "2026-03-26",
    ]);
  });

  it("carries each payday's amount", () => {
    expect(paydaysIn([biweekly], "2026-02")).toEqual([
      { date: "2026-02-13", amount: "800.00" },
      { date: "2026-02-27", amount: "800.00" },
    ]);
  });
});

describe("every N months", () => {
  it("pays on the first payday's day each month", () => {
    const monthly = schedule("2026-01-25", { frequency: "MONTHS", interval: 1 });
    expect(datesOf([monthly], "2026-06")).toEqual(["2026-06-25"]);
  });

  it("uses the last day when a month is too short", () => {
    const monthly = schedule("2026-01-31", { frequency: "MONTHS", interval: 1 });
    expect(datesOf([monthly], "2026-02")).toEqual(["2026-02-28"]);
    expect(datesOf([monthly], "2028-02")).toEqual(["2028-02-29"]); // leap year
    expect(datesOf([monthly], "2026-04")).toEqual(["2026-04-30"]);
    expect(datesOf([monthly], "2026-05")).toEqual(["2026-05-31"]); // back to the 31st
  });

  it("does every 3 months, skipping the months in between", () => {
    const quarterly = schedule("2026-01-25", { frequency: "MONTHS", interval: 3 });
    expect(datesOf([quarterly], "2026-04")).toEqual(["2026-04-25"]);
    expect(datesOf([quarterly], "2026-05")).toEqual([]);
    expect(datesOf([quarterly], "2027-01")).toEqual(["2027-01-25"]);
  });
});

describe("twice a month", () => {
  const twice = (starts: string, dayOne: number, dayTwo: number) =>
    schedule(starts, { frequency: "TWICE_A_MONTH", interval: null, dayOne, dayTwo });

  it("pays on the two chosen days", () => {
    expect(datesOf([twice("2026-01-01", 1, 15)], "2026-03")).toEqual(["2026-03-01", "2026-03-15"]);
  });

  it("treats 31 as the last day of the month", () => {
    expect(datesOf([twice("2026-01-15", 15, 31)], "2026-11")).toEqual(["2026-11-15", "2026-11-30"]);
    expect(datesOf([twice("2026-01-15", 15, 31)], "2026-02")).toEqual(["2026-02-15", "2026-02-28"]);
  });

  it("skips the chosen days before the schedule starts", () => {
    expect(datesOf([twice("2026-11-20", 15, 31)], "2026-11")).toEqual(["2026-11-30"]);
  });

  it("counts one payday when both days land on the same date in a short month", () => {
    expect(datesOf([twice("2026-01-30", 30, 31)], "2026-02")).toEqual(["2026-02-28"]);
  });
});

describe("changes and endings", () => {
  it("uses the new amount from a mid-month raise", () => {
    const before = schedule("2026-11-07", { amount: "800.00" });
    const raise = schedule("2026-11-21", { amount: "850.00" });

    expect(paydaysIn([raise, before], "2026-11")).toEqual([
      { date: "2026-11-07", amount: "800.00" },
      { date: "2026-11-21", amount: "850.00" },
    ]);
  });

  it("never changes paydays before the new schedule starts", () => {
    const before = schedule("2026-10-10", { amount: "800.00" });
    const raise = schedule("2026-11-21", { amount: "850.00" });

    expect(paydaysIn([before, raise], "2026-10")).toEqual([
      { date: "2026-10-10", amount: "800.00" },
      { date: "2026-10-24", amount: "800.00" },
    ]);
  });

  it("switches frequency mid-month, without the old rhythm carrying on", () => {
    const biweekly = schedule("2026-11-06");
    const monthly = schedule("2026-11-25", { frequency: "MONTHS", interval: 1, amount: "1700.00" });

    expect(paydaysIn([biweekly, monthly], "2026-11")).toEqual([
      { date: "2026-11-06", amount: "800.00" },
      { date: "2026-11-20", amount: "800.00" },
      { date: "2026-11-25", amount: "1700.00" },
    ]);
    expect(datesOf([biweekly, monthly], "2026-12")).toEqual(["2026-12-25"]);
  });

  it("stops after the last payday, e.g. when leaving a job", () => {
    const ended = schedule("2026-01-02", { endsOn: date("2026-01-16") });
    expect(datesOf([ended], "2026-01")).toEqual(["2026-01-02", "2026-01-16"]);
    expect(datesOf([ended], "2026-02")).toEqual([]);
  });

  it("does a one-time payment (first and last payday the same)", () => {
    const bonus = schedule("2026-12-18", {
      frequency: "MONTHS",
      interval: 1,
      endsOn: date("2026-12-18"),
      amount: "500.00",
    });
    expect(paydaysIn([bonus], "2026-12")).toEqual([{ date: "2026-12-18", amount: "500.00" }]);
    expect(datesOf([bonus], "2027-01")).toEqual([]);
  });

  it("restarts after a gap when a later schedule begins", () => {
    const job = schedule("2026-01-02", { endsOn: date("2026-02-13") });
    const back = schedule("2026-04-03");
    expect(datesOf([job, back], "2026-03")).toEqual([]);
    expect(datesOf([job, back], "2026-04")).toEqual(["2026-04-03", "2026-04-17"]);
  });

  it("has no paydays without any schedules", () => {
    expect(paydaysIn([], "2026-11")).toEqual([]);
  });
});
