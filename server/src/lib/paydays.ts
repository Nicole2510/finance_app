import type { PayFrequency } from "@prisma/client";

// The parts of a pay schedule the calculator needs. Dates are UTC midnight,
// the way Prisma returns @db.Date columns.
export type Schedule = {
  startsOn: Date; // first payday at this amount
  endsOn: Date | null; // last payday, if the schedule has ended
  amount: string; // per paycheque, e.g. "800.00"
  frequency: PayFrequency;
  interval: number | null; // weeks or months; null for twice a month
  dayOne: number | null; // twice a month only
  dayTwo: number | null; // twice a month only (31 = last day of the month)
};

export type Payday = { date: string; amount: string }; // date as "YYYY-MM-DD"

const DAY = 24 * 60 * 60 * 1000;

const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

// A day of a month that may be too short for it: the 31st of February is the
// 28th (or 29th), so "the 31st" always means the last day
function dayOf(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, Math.min(day, daysIn(year, month))));
}

const iso = (date: Date) => date.toISOString().slice(0, 10);

// Every payday a schedule produces from `from` to `to` (both included),
// ignoring other schedules
function paydaysOf(schedule: Schedule, from: Date, to: Date): Date[] {
  const start = schedule.startsOn;
  const dates: Date[] = [];

  if (schedule.frequency === "WEEKS") {
    const step = schedule.interval! * 7 * DAY;
    // Jump straight to the first payday on or after `from`
    const skip = Math.max(0, Math.ceil((from.getTime() - start.getTime()) / step));
    for (let t = start.getTime() + skip * step; t <= to.getTime(); t += step) {
      dates.push(new Date(t));
    }
  } else if (schedule.frequency === "MONTHS") {
    const day = start.getUTCDate();
    // Months since the first payday, rounded down to a whole number of steps
    const monthsAway =
      (from.getUTCFullYear() - start.getUTCFullYear()) * 12 +
      (from.getUTCMonth() - start.getUTCMonth());
    let k = Math.max(0, Math.floor(monthsAway / schedule.interval!));
    for (;;) {
      const months = start.getUTCMonth() + k * schedule.interval!;
      const date = dayOf(start.getUTCFullYear(), months, day);
      if (date > to) break;
      if (date >= from) dates.push(date);
      k += 1;
    }
  } else {
    // Twice a month, on the two chosen days, every month from `from`'s
    for (
      let year = from.getUTCFullYear(), month = from.getUTCMonth();
      dayOf(year, month, 1) <= to;
      month += 1
    ) {
      for (const day of [schedule.dayOne!, schedule.dayTwo!]) {
        const date = dayOf(year, month, day);
        // Two days can land on one in a short month (30th and 31st in
        // February); that's a single payday
        const repeat = dates.some((d) => d.getTime() === date.getTime());
        if (date >= from && date <= to && !repeat) dates.push(date);
      }
    }
  }

  return dates.filter((d) => d >= start);
}

// The paydays one income source has in a month. Each payday belongs to the
// latest schedule that started on or before it, so a raise or a new frequency
// mid-month is counted exactly; nothing is paid after a schedule's last
// payday unless a later schedule has started.
export function paydaysIn(schedules: Schedule[], month: string): Payday[] {
  const [year, monthNumber] = month.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1));
  const monthEnd = new Date(Date.UTC(year, monthNumber, 0));

  const sorted = [...schedules].sort((a, b) => a.startsOn.getTime() - b.startsOn.getTime());
  const paydays: Payday[] = [];

  sorted.forEach((schedule, i) => {
    // This schedule applies until the next one starts, or until it ends
    const next = sorted[i + 1];
    const until = new Date(
      Math.min(
        monthEnd.getTime(),
        schedule.endsOn?.getTime() ?? Infinity,
        next ? next.startsOn.getTime() - DAY : Infinity,
      ),
    );
    const from = new Date(Math.max(monthStart.getTime(), schedule.startsOn.getTime()));
    if (from > until) return;

    for (const date of paydaysOf(schedule, from, until)) {
      paydays.push({ date: iso(date), amount: schedule.amount });
    }
  });

  return paydays.sort((a, b) => a.date.localeCompare(b.date));
}
