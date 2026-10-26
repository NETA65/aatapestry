// /aatapestry-workshop.ics and /es/aatapestry-workshop.ics — the calendar invite in English and in
// Spanish, generated from site.json with the `ics` library. Title and location are the same as the
// Google / Outlook / Yahoo links (src/_data/calendar.js → calendar.text); the wording is i18n.json →
// calendar and labels. UID is stable, the same in both files, and SEQUENCE comes from site.json →
// event.calendarSequence, so a calendar app that RE-IMPORTS either file updates the entry (new Zoom
// link etc.) instead of adding a duplicate. Entries do not update by themselves.
//
// No ORGANIZER by default: with one, Outlook and some Google/iOS imports treat the file as a
// meeting request (Accept/Decline, RSVP mail to that address). The questions email goes in the
// DESCRIPTION instead. Set site.json → contact.icsOrganizer: true to add it anyway.
import { createEvent } from "ics";
import { applyTokens, plain } from "../../scripts/lib/tokens.mjs";

// The ics library folds lines at 75 CHARACTERS; RFC 5545 says 75 OCTETS. The description has "–"
// and "·" (2–3 bytes in UTF-8), so unfold and fold again by octets, never inside a character.
const foldOctets = (ics) => ics
  .replace(/\r\n[ \t]/g, "")
  .split("\r\n")
  .map((line) => {
    const parts = []; let cur = "", bytes = 0;
    for (const ch of line) {
      const n = Buffer.byteLength(ch);
      if (bytes + n > 75) { parts.push(cur); cur = " "; bytes = 1; }
      cur += ch; bytes += n;
    }
    parts.push(cur);
    return parts.join("\r\n");
  })
  .join("\r\n");

const capitalize = (s) => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);
// %title, %url in the alarm texts (not {title}: braces are the build's token syntax)
const fill = (s, map) => String(s || "").replace(/%([a-z]+)/gi, (m, k) => (k in map ? map[k] : m));

export default class {
  data() {
    return {
      pagination: { data: "icsLangs", size: 1, alias: "icsLang" },
      icsLangs: ["en", "es"],
      permalink: (data) => data.calendar.ics[data.icsLang],
      eleventyExcludeFromCollections: true,
      layout: false,
    };
  }
  render({ site, when, copy, i18n, calendar, icsLang }) {
    const es = icsLang === "es";
    const ev = site.event;
    const c = (i18n[icsLang] && i18n[icsLang].calendar) || {};
    const l = (i18n[icsLang] && i18n[icsLang].labels) || {};
    const tk = (s) => applyTokens(String(s ?? ""), { site, when });
    const { title, location } = calendar.text[icsLang];
    const pageUrl = new URL(es ? "/es/" : "/", site.url).href;
    // English: the longer JSON-LD summary; Spanish: the same details as the other providers' links.
    const summary = es ? tk(c.details) : tk((copy && copy.jsonld && copy.jsonld.eventSummary) || site.description);
    // when.js keeps each time together with no-break spaces (for the web pages); a calendar entry is plain
    // text (plain() from scripts/lib/tokens.mjs). The summary already says that Spanish and ASL
    // interpretation will be provided and event.cost mentions it again, so there is no "Interpretation:" line.
    // event.cost is English only (the Spanish file leaves it out; the Spanish FAQ has the cost answer).
    const description = plain([
      summary,
      "",
      `${l.when}: ${es ? `${capitalize(when.date.longEs)}, ${when.time.leadLongEs}` : `${when.date.long}, ${when.time.leadLong}`}`,
      es ? when.time.startsAlsoEs : when.time.startsAlso,
      `${l.joinZoom}: ${ev.zoom.joinUrl}`,
      `${l.meetingId}: ${ev.zoom.meetingId}`,
      `${l.passcode}: ${ev.zoom.passcode}`,
      ...(ev.zoom.dialIn && ev.zoom.dialIn.length ? [`${l.dialIn}: ${ev.zoom.dialIn.join(", ")}`] : []),
      "",
      ...(ev.cost && !es ? [tk(ev.cost)] : []),
      ...(site.contact.email ? [`${c.questionsLabel}: ${site.contact.email}`] : []),
      "",
      `${c.detailsLabel}: ${pageUrl}`,
    ].join("\n"));

    const { error, value } = createEvent({
      uid: `workshop-${ev.date}@${site.domain}`,
      sequence: Number(ev.calendarSequence) || 0,
      productId: `${site.domain}//workshop`,
      calName: site.name,
      start: when.startArray,
      startInputType: "utc",
      startOutputType: "utc",
      end: when.endArray,
      endInputType: "utc",
      endOutputType: "utc",
      title,
      description,
      location,
      url: pageUrl,
      status: ev.status === "cancelled" ? "CANCELLED" : ev.status === "postponed" ? "TENTATIVE" : "CONFIRMED",
      busyStatus: "BUSY",
      categories: ["A.A.", "Workshop", "Three Legacies"],
      ...(site.contact.email && site.contact.icsOrganizer === true ? { organizer: { name: site.contact.committee, email: site.contact.email } } : {}),
      alarms: [
        { action: "display", description: plain(fill(c.alarmTomorrow, { title, url: ev.zoom.joinUrl })), trigger: { hours: 24, minutes: 0, before: true } },
        { action: "display", description: plain(fill(c.alarmSoon, { title, url: ev.zoom.joinUrl })), trigger: { hours: 0, minutes: 30, before: true } },
      ],
    });
    if (error) throw error;
    return foldOctets(value);
  }
}
