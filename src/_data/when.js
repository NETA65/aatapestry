// Everything date/time about the workshop, worked out ONCE from site.json at build time
// (Luxon, with the IANA timezone in site.json → correct across daylight-saving changes).
// Used by every page, the poster, the .ics file, the JSON-LD and the social card.
import { DateTime } from "luxon";
import site from "./site.json" with { type: "json" };

const ev = site.event;
const zone = ev.timezone;
const start = DateTime.fromISO(`${ev.date}T${ev.start}`, { zone });
const end = DateTime.fromISO(`${ev.date}T${ev.end}`, { zone });
const now = DateTime.now().setZone(zone);

const range = (s, e, locale = "en") => `${s.setLocale(locale).toFormat("h:mm a")} – ${e.setLocale(locale).toFormat("h:mm a")}`;
const esTime = (dt) => dt.setLocale("es").toFormat("h:mm a").replace(/\s?(a|p)\.?\s?m\.?/i, (m, ap) => ` ${ap.toLowerCase()}. m.`);
const rangeEs = (s, e) => `${esTime(s)} – ${esTime(e)}`;
const esTimeShort = (dt) => dt.setLocale("es").toFormat("h a").replace(/s?(a|p).?s?m.?/i, (m, ap) => ` ${ap.toLowerCase()}. m.`);
const rangeShortEs = (s, e) => `${esTimeShort(s)} – ${esTimeShort(e)}`;

// Other US time zones (and UTC) so nobody has to do the arithmetic.
const ZONES = [
  { id: "America/Los_Angeles", label: "Pacific", labelEs: "Pacífico" },
  { id: "America/Denver", label: "Mountain", labelEs: "Montaña" },
  { id: "America/Chicago", label: "Central", labelEs: "Centro" },
  { id: "America/New_York", label: "Eastern", labelEs: "Este" },
  { id: "America/Anchorage", label: "Alaska", labelEs: "Alaska" },
  { id: "Pacific/Honolulu", label: "Hawaii", labelEs: "Hawái" },
  { id: "UTC", label: "UTC", labelEs: "UTC" },
];
const zones = ZONES.map((z) => {
  const s = start.setZone(z.id), e = end.setZone(z.id);
  const nextDay = e.toISODate() !== start.toISODate();
  return { ...z, abbr: s.toFormat("ZZZZ"), range: range(s, e), rangeEs: rangeEs(s, e), nextDay, startISO: s.toISO(), endISO: e.toISO(), isEvent: z.id === zone };
});

const lunchStart = ev.lunch?.start ? DateTime.fromISO(`${ev.date}T${ev.lunch.start}`, { zone }) : null;
const lunchEnd = lunchStart ? lunchStart.plus({ minutes: ev.lunch.durationMinutes || 30 }) : null;

const phase = now < start ? "upcoming" : now <= end ? "live" : "past";
const daysUntil = Math.ceil(start.startOf("day").diff(now.startOf("day"), "days").days);

export default {
  zone,
  tzShort: ev.timezoneShort,
  tzAbbr: start.toFormat("ZZZZ"), // "PST"
  offset: start.toFormat("ZZ"), // "-08:00"
  startISO: start.toISO(), // 2026-12-12T08:00:00.000-08:00
  endISO: end.toISO(),
  startUTC: start.toUTC().toISO(),
  endUTC: end.toUTC().toISO(),
  // For the .ics file (UTC, as arrays): [year, month, day, hour, minute]
  startArray: [start.toUTC().year, start.toUTC().month, start.toUTC().day, start.toUTC().hour, start.toUTC().minute],
  endArray: [end.toUTC().year, end.toUTC().month, end.toUTC().day, end.toUTC().hour, end.toUTC().minute],
  durationHours: end.diff(start, "hours").hours,
  date: {
    iso: ev.date,
    long: start.toFormat("cccc, LLLL d, yyyy"), // Saturday, December 12, 2026
    medium: start.toFormat("ccc, LLL d, yyyy"), // Sat, Dec 12, 2026
    short: start.toFormat("LLL d, yyyy"),
    weekday: start.toFormat("cccc"),
    month: start.toFormat("LLLL"),
    monthShort: start.toFormat("LLL").toUpperCase(),
    day: start.toFormat("d"),
    year: start.toFormat("yyyy"),
    longEs: start.setLocale("es").toFormat("cccc d 'de' LLLL 'de' yyyy"), // sábado 12 de diciembre de 2026
    weekdayEs: start.setLocale("es").toFormat("cccc"),
    monthEs: start.setLocale("es").toFormat("LLLL"),
  },
  time: {
    range: range(start, end), // 8:00 AM – 4:00 PM
    rangeShort: `${start.toFormat("h a")} – ${end.toFormat("h a")}`, // 8 AM – 4 PM
    rangeEs: rangeEs(start, end),
    rangeShortEs: rangeShortEs(start, end), // 8 a. m. – 4 p. m.
    start: start.toFormat("h:mm a"),
    end: end.toFormat("h:mm a"),
    startShort: start.toFormat("h a"),
    endShort: end.toFormat("h a"),
    doorsOpen: start.minus({ minutes: 15 }).toFormat("h:mm a"),
  },
  zones,
  lunch: lunchStart
    ? { start: lunchStart.toFormat("h:mm a"), end: lunchEnd.toFormat("h:mm a"), startEs: esTime(lunchStart), endEs: esTime(lunchEnd), minutes: ev.lunch.durationMinutes || 30, tentative: !!ev.lunch.tentative }
    : { minutes: ev.lunch?.durationMinutes || 30, tentative: true },
  status: { phase, daysUntil, isToday: now.toISODate() === ev.date, isPast: phase === "past", isLive: phase === "live" },
  zoomMeetingIdDigits: String(ev.zoom.meetingId || "").replace(/\D/g, ""),
  builtAt: now.toISO(),
};
