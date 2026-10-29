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

// Validates a request body; sends a 400 with the first problem if invalid
export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HttpError(400, result.error.issues[0]?.message ?? "Invalid request");
  }
  return result.data;
}
