// "Add to calendar" links for each provider, per language, worked out once from site.json + when.js.
// Every link opens the provider's own "new event" form already filled in (title, UTC start/end,
// details, location). Apple Calendar and desktop Outlook use the .ics file of the same language
// (src/pages/workshop-ics.11ty.js), which carries the same title and location.
// Titles and details come from i18n.json → calendar; the Zoom details are appended from site.json.
// Templates: calendar[lang] (the menu items), calendar.ics[lang] (the .ics file's address) and
// calendar.text[lang] (the entry's title and location, which the .ics file shares).
// Default export only: Eleventy would otherwise hand templates the module ({ default, … }).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import site from "./site.json" with { type: "json" };
import when from "./when.js";
import { applyTokens, plain } from "../../scripts/lib/tokens.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
let i18n = {};
try { i18n = JSON.parse(fs.readFileSync(path.join(here, "i18n.json"), "utf8")); } catch { /* the build reports the parse error */ }

// The calendar file, one per language (same UID and SEQUENCE in both, so importing either updates one entry).
const icsPath = (lang) => (lang === "es" ? "/es/aatapestry-workshop.ics" : "/aatapestry-workshop.ics");

const z = site.event.zoom;
// 20261212T160000Z
const compact = (iso) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const start = compact(when.startUTC);
const end = compact(when.endUTC);
const q = (params) => Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");

// The entry's title and location, shared with the .ics file.
function calendarText(lang) {
  const c = (i18n[lang] && i18n[lang].calendar) || {};
  const tk = (s) => plain(applyTokens(String(s || ""), { site, when }));
  return { title: tk(c.title || site.event.name), location: `Zoom: ${z.joinUrl}` };
}

function links(lang) {
  const c = (i18n[lang] && i18n[lang].calendar) || {};
  const l = (i18n[lang] && i18n[lang].labels) || {};
  const tk = (s) => plain(applyTokens(String(s || ""), { site, when }));
  const { title, location } = calendarText(lang);
  const details = [tk(c.details), "", `${l.joinZoom || "Join on Zoom"}: ${z.joinUrl}`, `${l.meetingId || "Meeting ID"}: ${z.meetingId}`, `${l.passcode || "Passcode"}: ${z.passcode}`, "", lang === "es" ? `${site.url}/es/` : `${site.url}/`].join("\n");
  const outlookParams = { path: "/calendar/action/compose", rru: "addevent", subject: title, startdt: when.startUTC, enddt: when.endUTC, body: details, location };
  return [
    { key: "google", label: c.google, href: `https://calendar.google.com/calendar/render?${q({ action: "TEMPLATE", text: title, dates: `${start}/${end}`, details, location, ctz: site.event.timezone })}` },
    // file: a same-tab link to the .ics, without `download` (iOS Safari then offers to add the event).
    { key: "apple", label: c.apple, href: icsPath(lang), file: true },
    { key: "outlook", label: c.outlook, href: `https://outlook.live.com/calendar/0/action/compose?${q(outlookParams)}` },
    { key: "office", label: c.office, href: `https://outlook.office.com/calendar/0/action/compose?${q(outlookParams)}` },
    { key: "yahoo", label: c.yahoo, href: `https://calendar.yahoo.com/?${q({ v: 60, title, st: start, et: end, desc: details, in_loc: location })}` },
  ];
}

export default {
  en: links("en"),
  es: links("es"),
  ics: { en: icsPath("en"), es: icsPath("es") },
  text: { en: calendarText("en"), es: calendarText("es") },
};
