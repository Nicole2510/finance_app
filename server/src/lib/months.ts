import { z } from "zod";

// A calendar month written as "2026-10"
export const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must look like 2026-10");

// The first day of a month, and of the month after: "2026-12" → Dec 1, Jan 1
export function monthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    gte: new Date(Date.UTC(year, monthNumber - 1, 1)),
    lt: new Date(Date.UTC(year, monthNumber, 1)),
  };
}

// The date a month is stored as: its 1st, e.g. "2026-10" → Oct 1
export function monthStart(month: string) {
  return monthRange(month).gte;
}

// The month before: "2026-01" → "2025-12"
export function previousMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 2, 1));
  return date.toISOString().slice(0, 7);
}
