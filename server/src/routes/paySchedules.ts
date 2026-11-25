import { Router, type Request } from "express";
import { z } from "zod";
import type { PaySchedule } from "@prisma/client";
import { prisma } from "../db.js";
import { requireUser } from "../middleware/requireUser.js";
import { HttpError } from "../lib/httpError.js";
import { dateSchema, moneySchema, parseBody } from "../lib/validation.js";

// An income source's pay schedules: how much it pays and when, from a first
// payday on. Mounted at /api/income-sources/:sourceId/schedules.
export const paySchedulesRouter = Router({ mergeParams: true });
paySchedulesRouter.use(requireUser);

const wholeNumber = z.number().int("must be a whole number");

const fields = {
  startsOn: dateSchema, // first payday at this amount
  endsOn: dateSchema.nullable(), // last payday; null = still paid
  amount: moneySchema.refine((value) => Number(value) > 0, "amount must be above zero"),
  frequency: z.enum(["WEEKS", "MONTHS", "TWICE_A_MONTH"]),
  interval: wholeNumber.nullable(), // every N weeks or months
  dayOne: wholeNumber.nullable(), // twice a month only
  dayTwo: wholeNumber.nullable(),
};

const createSchema = z.strictObject({
  ...fields,
  endsOn: fields.endsOn.optional(),
  interval: fields.interval.optional(),
  dayOne: fields.dayOne.optional(),
  dayTwo: fields.dayTwo.optional(),
});
const updateSchema = z.strictObject(fields).partial();

type Values = {
  startsOn: string;
  endsOn: string | null;
  amount: string;
  frequency: "WEEKS" | "MONTHS" | "TWICE_A_MONTH";
  interval: number | null;
  dayOne: number | null;
  dayTwo: number | null;
};

// The rules for a whole schedule (the database checks the same ones). Returns
// the values tidied up: only the fields its frequency uses, days in order.
function checked(v: Values): Values {
  if (v.endsOn !== null && v.endsOn < v.startsOn) {
    throw new HttpError(400, "The last payday can't be before the first payday");
  }
  if (v.frequency === "TWICE_A_MONTH") {
    const days = [v.dayOne, v.dayTwo];
    if (days.some((d) => d === null || d < 1 || d > 31)) {
      throw new HttpError(400, "Choose two paydays between the 1st and the 31st");
    }
    if (v.dayOne === v.dayTwo) throw new HttpError(400, "Choose two different paydays");
    const [dayOne, dayTwo] = (days as number[]).sort((a, b) => a - b);
    return { ...v, interval: null, dayOne, dayTwo };
  }
  const [max, unit] = v.frequency === "WEEKS" ? [52, "weeks"] : [12, "months"];
  if (v.interval === null || v.interval < 1 || v.interval > max) {
    throw new HttpError(400, `Choose every 1 to ${max} ${unit}`);
  }
  return { ...v, dayOne: null, dayTwo: null };
}

const day = (date: Date) => date.toISOString().slice(0, 10);

function toJson(s: PaySchedule) {
  return {
    id: s.id,
    startsOn: day(s.startsOn),
    endsOn: s.endsOn ? day(s.endsOn) : null,
    amount: s.amount.toFixed(2),
    frequency: s.frequency,
    interval: s.interval,
    dayOne: s.dayOne,
    dayTwo: s.dayTwo,
  };
}

function toData(v: Values) {
  return {
    ...v,
    startsOn: new Date(v.startsOn),
    endsOn: v.endsOn === null ? null : new Date(v.endsOn),
  };
}

// The :sourceId from the parent path (/api/income-sources/:sourceId/schedules)
const sourceIdOf = (req: Request) => (req.params as Record<string, string>).sourceId;

// The income source, only if it's this user's; otherwise 404
async function ownedSource(userId: string, sourceId: unknown) {
  const id = z.uuid().safeParse(sourceId);
  const source = id.success
    ? await prisma.incomeSource.findFirst({ where: { id: id.data, userId } })
    : null;
  if (!source) throw new HttpError(404, "Income source not found");
  return source;
}

async function ownedSchedule(sourceId: string, scheduleId: unknown) {
  const id = z.uuid().safeParse(scheduleId);
  const schedule = id.success
    ? await prisma.paySchedule.findFirst({ where: { id: id.data, incomeSourceId: sourceId } })
    : null;
  if (!schedule) throw new HttpError(404, "Pay schedule not found");
  return schedule;
}

// One schedule per start date per source, with a message people can act on
async function assertStartFree(sourceId: string, startsOn: string, exceptId?: string) {
  const clash = await prisma.paySchedule.findFirst({
    where: {
      incomeSourceId: sourceId,
      startsOn: new Date(startsOn),
      ...(exceptId ? { NOT: { id: exceptId } } : {}),
    },
  });
  if (clash) {
    const label = new Date(startsOn).toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
    throw new HttpError(409, `This source already has a schedule starting on ${label}`);
  }
}

// A source's schedules, oldest first
paySchedulesRouter.get("/", async (req, res) => {
  const source = await ownedSource(req.user!.id, sourceIdOf(req));
  const schedules = await prisma.paySchedule.findMany({
    where: { incomeSourceId: source.id },
    orderBy: { startsOn: "asc" },
  });
  res.json(schedules.map(toJson));
});

// Adds a schedule (a new job, a raise, a new frequency, a one-time payment)
paySchedulesRouter.post("/", async (req, res) => {
  const userId = req.user!.id;
  const source = await ownedSource(userId, sourceIdOf(req));
  if (source.archivedAt) {
    throw new HttpError(409, "Restore this income source to add a pay schedule");
  }
  const body = parseBody(createSchema, req.body);
  const values = checked({
    ...body,
    endsOn: body.endsOn ?? null,
    interval: body.interval ?? null,
    dayOne: body.dayOne ?? null,
    dayTwo: body.dayTwo ?? null,
  });
  await assertStartFree(source.id, values.startsOn);

  const schedule = await prisma.paySchedule.create({
    data: { ...toData(values), incomeSourceId: source.id, userId },
  });
  res.status(201).json(toJson(schedule));
});

// Edits a schedule, e.g. fixing an amount or setting a last payday when
// leaving a job. The result must still follow every rule.
paySchedulesRouter.patch("/:scheduleId", async (req, res) => {
  const source = await ownedSource(req.user!.id, sourceIdOf(req));
  const existing = await ownedSchedule(source.id, req.params.scheduleId);
  const changes = parseBody(updateSchema, req.body);

  const values = checked({ ...toJson(existing), ...changes });
  if (changes.startsOn !== undefined) {
    await assertStartFree(source.id, values.startsOn, existing.id);
  }

  const schedule = await prisma.paySchedule.update({
    where: { id: existing.id },
    data: toData(values),
  });
  res.json(toJson(schedule));
});

paySchedulesRouter.delete("/:scheduleId", async (req, res) => {
  const source = await ownedSource(req.user!.id, sourceIdOf(req));
  const schedule = await ownedSchedule(source.id, req.params.scheduleId);
  await prisma.paySchedule.delete({ where: { id: schedule.id } });
  res.status(204).end();
});
