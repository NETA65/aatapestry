// Everything date/time about the workshop, worked out ONCE from site.json at build time
// (Luxon, with the IANA timezone in site.json → correct across daylight-saving changes).
// Used by every page, the poster, the .ics file, the JSON-LD and the social cards.
// House style: lead with the event's zone (Eastern, "ET"), then the flyer's second line
// "8:00 AM PT · 9:00 AM MT · 10:00 AM CT". The exact abbreviation (EST) is for the zone table only.
import { DateTime } from "luxon";
import site from "./site.json" with { type: "json" };

const ev = site.event;
const zone = ev.timezone;
const start = DateTime.fromISO(`${ev.date}T${ev.start}`, { zone });
const end = DateTime.fromISO(`${ev.date}T${ev.end}`, { zone });
const now = DateTime.now().setZone(zone);

// Every space INSIDE a time ("11:00 a. m."), a range ("11:00 AM – 7:00 PM") and before a zone ("7:00 PM ET")
// is a no-break space (U+00A0, NB below), so a browser never splits "a." / "m. CT" or "7:00 PM" / "ET" across
// lines; between zones, a line may break only AFTER the " · ", never before it. ICU's narrow no-break space (U+202F, which the Inter subset
// cannot draw) never gets through. scripts/build-brand.mjs turns NB back into plain spaces for the social cards.
const NB = "\u00A0";
const nb = (s) => s.replace(/[ \u00A0\u202F]/g, NB);
const esMeridiem = (s) => nb(s.replace(/\s?(a|p)\.?\s?m\.?/i, (m, ap) => ` ${ap.toLowerCase()}. m.`));
const enTime = (dt) => nb(dt.setLocale("en").toFormat("h:mm a"));
const enTimeShort = (dt) => nb(dt.setLocale("en").toFormat("h a"));
const esTime = (dt) => esMeridiem(dt.setLocale("es").toFormat("h:mm a"));
const esTimeShort = (dt) => esMeridiem(dt.setLocale("es").toFormat("h a"));
// Browsers may still break right after an en dash, even before a no-break space; an invisible word
// joiner (U+2060) after the dash forbids that too: "11:00 AM – 7:00 PM ET" stays on one line.
const DASH = `${NB}–\u2060${NB}`;
const range = (s, e) => `${enTime(s)}${DASH}${enTime(e)}`;
const rangeEs = (s, e) => `${esTime(s)}${DASH}${esTime(e)}`;
const rangeShort = (s, e) => `${enTimeShort(s)}${DASH}${enTimeShort(e)}`;
const rangeShortEs = (s, e) => `${esTimeShort(s)}${DASH}${esTimeShort(e)}`;

// The time-zone table (/program/): the event's zone first, then the rest of the US, Puerto Rico
// and Mexico City (for Spanish speakers), London, India and eastern Australia (west to east), and UTC.
// `short` is the generic US label (ET/CT/MT/PT).
// `abbrs` ([standard, summer]) is for zones whose abbreviation Luxon only gives as an offset in en-US
// ("GMT+5:30", "GMT+11"); the one in effect on the event's date is shown.
// `aliases` lists the other IANA ids a browser may report for the row's place (app.js marks the
// visitor's row): older names (Asia/Calcutta, which Chrome reports for India) and the places that keep
// its time all year and fit its label (Belfast, Jersey, Guernsey, the Isle of Man; Melbourne, Canberra,
// Hobart). Not Brisbane (no summer time: an hour behind Sydney in December), nor Dublin or Lisbon
// (London's clock, but not "London (UK)").
// The no-break space in "(Reino Unido)" keeps the brackets on one line when the label wraps.
const ZONES = [
  { id: "America/New_York", label: "Eastern", labelEs: "Este", short: "ET" },
  { id: "America/Chicago", label: "Central", labelEs: "Centro", short: "CT" },
  { id: "America/Denver", label: "Mountain", labelEs: "Montaña", short: "MT" },
  { id: "America/Los_Angeles", label: "Pacific", labelEs: "Pacífico", short: "PT" },
  { id: "America/Anchorage", label: "Alaska", labelEs: "Alaska", short: "AKT" },
  { id: "Pacific/Honolulu", label: "Hawaii", labelEs: "Hawái", short: "HT" },
  { id: "America/Puerto_Rico", label: "Puerto Rico", labelEs: "Puerto Rico", short: "AT" },
  { id: "America/Mexico_City", label: "Mexico City", labelEs: "Ciudad de México", short: "" },
  { id: "Europe/London", label: "London (UK)", labelEs: `Londres (Reino${NB}Unido)`, short: "", abbrs: ["GMT", "BST"],
    aliases: ["Europe/Belfast", "Europe/Guernsey", "Europe/Isle_of_Man", "Europe/Jersey", "GB"] },
  { id: "Asia/Kolkata", label: "India", labelEs: "India", short: "", abbrs: ["IST"], aliases: ["Asia/Calcutta"] },
  { id: "Australia/Sydney", label: "Australia (Sydney)", labelEs: "Australia (Sídney)", short: "", abbrs: ["AEST", "AEDT"],
    aliases: ["Australia/Melbourne", "Australia/Canberra", "Australia/Hobart", "Australia/ACT", "Australia/NSW", "Australia/Victoria", "Australia/Tasmania", "Australia/Currie"] },
  { id: "UTC", label: "UTC", labelEs: "UTC", short: "UTC" },
];
// The local day, shown in the table only where it is not the event's own day (Sydney's Sunday).
const enDay = (dt) => dt.setLocale("en").toFormat("cccc, LLLL d"); // Sunday, December 13
const esDay = (dt) => dt.setLocale("es").toFormat("cccc d 'de' LLLL"); // domingo 13 de diciembre
const inZone = (z) => {
  const s = start.setZone(z.id), e = end.setZone(z.id);
  const otherDay = s.toISODate() !== start.toISODate();
  return {
    ...z,
    abbr: z.abbrs ? z.abbrs[s.isInDST ? 1 : 0] || z.abbrs[0] : s.toFormat("ZZZZ"), // "EST", "PST", "AST", "CST", "UTC"; "GMT", "IST", "AEDT"
    start: enTime(s), startEs: esTime(s), end: enTime(e), endEs: esTime(e),
    range: range(s, e), rangeEs: rangeEs(s, e),
    // Where the workshop falls on another day (Sydney: all of it on Sunday), that day; and where it ends
    // on a later day than it starts there (London, India, UTC: at or after midnight), "ends the next day".
    day: otherDay ? enDay(s) : "", dayEs: otherDay ? esDay(s) : "",
    nextDay: e.toISODate() !== s.toISODate(),
    startISO: s.toISO(), endISO: e.toISO(),
    isEvent: z.id === zone,
  };
};
const zones = ZONES.map(inZone);
// The same abbreviations for the visitor's own time (app.js, [data-local-time] on every page): their
// browser names these zones only by offset ("GMT+5:30", "GMT+11"), so the box would disagree with the
// table's IST / AEDT. Keyed by every id the browser may report (the row's id and its aliases).
const localAbbrs = Object.fromEntries(zones.filter((z) => z.abbrs).flatMap((z) => [z.id, ...(z.aliases || [])].map((id) => [id, z.abbr])));

// The flyer's second line: the other continental US zones, west to east (PT, MT, CT), never the event's own zone.
const ALSO = ["America/Los_Angeles", "America/Denver", "America/Chicago"].filter((id) => id !== zone);
const also = ALSO.map((id) => {
  const z = inZone(ZONES.find((x) => x.id === id));
  return { id: z.id, short: z.short, label: z.label, labelEs: z.labelEs, abbr: z.abbr, start: z.start, startEs: z.startEs, end: z.end, endEs: z.endEs, range: z.range, rangeEs: z.rangeEs };
});
// The "·" is glued to the zone before it (no-break space), so a wrapped line never starts with a dot.
const joinAlso = (fn) => also.map(fn).join(`${NB}· `);

const tzShort = ev.timezoneShort; // "ET"
const tzLabel = ev.timezoneLabel; // "Eastern Time"
const tzLabelEs = ev.timezoneLabelEs; // "hora del Este"

const phase = now < start ? "upcoming" : now <= end ? "live" : "past";
const daysUntil = Math.ceil(start.startOf("day").diff(now.startOf("day"), "days").days);

export default {
  zone,
  tzShort,
  tzAbbr: start.toFormat("ZZZZ"), // "EST" (zone table only; prose uses tzShort "ET")
  tzLabel,
  tzLabelEs,
  offset: start.toFormat("ZZ"), // "-05:00"
  startISO: start.toISO(), // 2026-12-12T11:00:00.000-05:00
  endISO: end.toISO(), // 2026-12-12T19:00:00.000-05:00
  startUTC: start.toUTC().toISO(), // 2026-12-12T16:00:00.000Z
  endUTC: end.toUTC().toISO(), // 2026-12-13T00:00:00.000Z
  // For the .ics file (UTC, as arrays): [year, month, day, hour, minute]
  startArray: [start.toUTC().year, start.toUTC().month, start.toUTC().day, start.toUTC().hour, start.toUTC().minute],
  endArray: [end.toUTC().year, end.toUTC().month, end.toUTC().day, end.toUTC().hour, end.toUTC().minute],
  durationHours: end.diff(start, "hours").hours,
  date: {
    iso: ev.date,
    long: start.toFormat("cccc, LLLL d, yyyy"), // Saturday, December 12, 2026
    medium: start.toFormat("ccc, LLL d, yyyy"), // Sat, Dec 12, 2026
    short: start.toFormat("LLL d, yyyy"), // Dec 12, 2026
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
    range: range(start, end), // 11:00 AM – 7:00 PM
    rangeShort: rangeShort(start, end), // 11 AM – 7 PM
    rangeEs: rangeEs(start, end), // 11:00 a. m. – 7:00 p. m.
    rangeShortEs: rangeShortEs(start, end), // 11 a. m. – 7 p. m.
    start: enTime(start), // 11:00 AM
    end: enTime(end), // 7:00 PM
    startEs: esTime(start), // 11:00 a. m.
    endEs: esTime(end), // 7:00 p. m.
    startShort: enTimeShort(start), // 11 AM
    endShort: enTimeShort(end), // 7 PM
    lead: `${range(start, end)}${NB}${tzShort}`, // 11:00 AM – 7:00 PM ET
    leadEs: `${rangeEs(start, end)}${NB}${tzShort}`, // 11:00 a. m. – 7:00 p. m. ET
    leadLong: `${range(start, end)} ${tzLabel} (${tzShort})`, // 11:00 AM – 7:00 PM Eastern Time (ET)
    leadLongEs: `${rangeEs(start, end)}, ${tzLabelEs} (${tzShort})`, // 11:00 a. m. – 7:00 p. m., hora del Este (ET)
    leadShort: `${rangeShort(start, end)}${NB}${tzShort}`, // 11 AM – 7 PM ET
    leadShortEs: `${rangeShortEs(start, end)}${NB}${tzShort}`, // 11 a. m. – 7 p. m. ET
    startZone: `${enTime(start)}${NB}${tzShort}`, // 11:00 AM ET (the flyer's "Starting at 11am ET")
    startZoneEs: `${esTime(start)}${NB}${tzShort}`, // 11:00 a. m. ET
    startsAlso: joinAlso((a) => `${a.start}${NB}${a.short}`), // 8:00 AM PT · 9:00 AM MT · 10:00 AM CT
    startsAlsoEs: joinAlso((a) => `${a.startEs}${NB}${a.short}`), // 8:00 a. m. PT · 9:00 a. m. MT · 10:00 a. m. CT
    endsAlso: joinAlso((a) => `${a.end}${NB}${a.short}`), // 4:00 PM PT · 5:00 PM MT · 6:00 PM CT
    endsAlsoEs: joinAlso((a) => `${a.endEs}${NB}${a.short}`), // 4:00 p. m. PT · 5:00 p. m. MT · 6:00 p. m. CT
    rangesAlso: joinAlso((a) => `${a.range}${NB}${a.short}`), // 8:00 AM – 4:00 PM PT · 9:00 AM – 5:00 PM MT · 10:00 AM – 6:00 PM CT
    rangesAlsoEs: joinAlso((a) => `${a.rangeEs}${NB}${a.short}`),
  },
  also,
  zones,
  localAbbrs, // { "Asia/Kolkata": "IST", "Asia/Calcutta": "IST", "Australia/Sydney": "AEDT", … }
  status: { phase, daysUntil, isToday: now.toISODate() === ev.date, isPast: phase === "past", isLive: phase === "live" },
  zoomMeetingIdDigits: String(ev.zoom.meetingId || "").replace(/\D/g, ""),
  builtAt: now.toISO(),
};
