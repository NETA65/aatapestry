// The 36 Principles meeting: which number (and, in a 36-week cycle, which legacy) is the
// focus THIS week, the next meeting date, and the next twelve meetings — all worked out from
// meeting.json. The weekly scheduled rebuild (see .github/workflows/deploy.yml) keeps it current.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DateTime } from "luxon";
import meeting from "./meeting.json" with { type: "json" };

const here = path.dirname(fileURLToPath(import.meta.url));
let principles = { items: [] };
try {
  principles = JSON.parse(fs.readFileSync(path.join(here, "principles.json"), "utf8"));
} catch {
  /* principles.json not written yet — the pages still build */
}

const LEGACIES = ["recovery", "unity", "service"];
const WEEKDAYS = { sunday: 7, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
const zone = meeting.timezone || "America/Los_Angeles";
const now = DateTime.now().setZone(zone);

const weekday = WEEKDAYS[String(meeting.weekday || "").toLowerCase()];
const [hh, mm] = String(meeting.time || "").split(":").map(Number);
const hasSchedule = !!(weekday && Number.isFinite(hh));
const cycleStart = meeting.cycle?.startDate ? DateTime.fromISO(meeting.cycle.startDate, { zone }) : null;
const weeksPer = Math.max(1, Number(meeting.cycle?.weeksPerNumber) || 1);
const byPrinciple = meeting.cycle?.mode === "by-principle";
const total = byPrinciple ? 36 : 12;

// Which slot of the cycle a given date falls in (0-based), or null when no cycle is configured.
function slotFor(dt) {
  if (!cycleStart || !cycleStart.isValid) return null;
  const weeks = Math.floor(dt.startOf("day").diff(cycleStart.startOf("day"), "weeks").weeks / weeksPer);
  return ((weeks % total) + total) % total;
}
function describe(slot) {
  if (slot === null) return null;
  const n = byPrinciple ? Math.floor(slot / 3) + 1 : slot + 1;
  const legacy = byPrinciple ? LEGACIES[slot % 3] : null;
  const item = principles.items.find((p) => p.n === n) || null;
  return { n, legacy, item, slot };
}

// Next meeting at or after "from" (same day counts if the meeting has not ended yet).
function nextMeeting(from) {
  if (!hasSchedule) return null;
  let d = from.set({ hour: hh, minute: mm || 0, second: 0, millisecond: 0 });
  const shift = (weekday - d.weekday + 7) % 7;
  d = d.plus({ days: shift });
  if (d.plus({ minutes: meeting.durationMinutes || 60 }) < from) d = d.plus({ weeks: 1 });
  return d;
}

const next = nextMeeting(now);
const upcoming = [];
if (next) {
  for (let i = 0; i < 12; i++) {
    const d = next.plus({ weeks: i });
    upcoming.push({ date: d.toISODate(), dateLong: d.toFormat("cccc, LLLL d"), time: d.toFormat("h:mm a"), iso: d.toISO(), ...(describe(slotFor(d)) || {}) });
  }
}

export default {
  published: !!meeting.published,
  configured: hasSchedule,
  cycleConfigured: !!cycleStart && cycleStart.isValid,
  mode: byPrinciple ? "by-principle" : "by-number",
  current: describe(slotFor(now)),
  next: next ? { date: next.toISODate(), dateLong: next.toFormat("cccc, LLLL d, yyyy"), time: next.toFormat("h:mm a"), iso: next.toISO(), abbr: next.toFormat("ZZZZ"), ...(describe(slotFor(next)) || {}) } : null,
  upcoming,
  timeLabel: hasSchedule ? DateTime.fromObject({ hour: hh, minute: mm || 0 }, { zone }).toFormat("h:mm a") : "",
  weekdayLabel: meeting.weekday ? meeting.weekday.charAt(0).toUpperCase() + meeting.weekday.slice(1).toLowerCase() : "",
  rrule: hasSchedule ? `FREQ=WEEKLY;BYDAY=${["", "MO", "TU", "WE", "TH", "FR", "SA", "SU"][weekday]}` : "",
  zone,
};
