import { z } from "zod";
import { HttpError } from "./httpError.js";

// A name like "Groceries": trimmed, not empty, not too long
export const nameSchema = z
  .string()
  .trim()
  .min(1, "Name can't be empty")
  .max(40, "Name must be 40 characters or fewer");

// Exactly one emoji (including multi-part ones like 👩‍💻 or 🇨🇦)
const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
const emojiPattern = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u;

export const emojiSchema = z
  .string()
  .trim()
  .refine(
    (value) => [...segmenter.segment(value)].length === 1 && emojiPattern.test(value),
    "Emoji must be a single emoji",
  );

// Money as a string so cents stay exact: optional minus, up to 10 digits and
// 2 decimals, e.g. "2430", "-530.00"
export const moneySchema = z
  .string()
  .regex(/^-?\d{1,10}(\.\d{1,2})?$/, "must be a string of money, e.g. '2430.00'");

// A real calendar date as "YYYY-MM-DD"
export const dateSchema = z.string().refine((value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false; // e.g. month 13
  return date.toISOString().slice(0, 10) === value; // e.g. Feb 30 rolls over to March
}, "must be a valid date in the format YYYY-MM-DD");

// Validates a request body; sends a 400 with the first problem if invalid
export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HttpError(400, result.error.issues[0]?.message ?? "Invalid request");
  }
  return result.data;
}
