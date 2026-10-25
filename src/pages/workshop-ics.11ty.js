// /aatapestry-workshop.ics — the calendar invite, generated from site.json with the `ics`
// library. UID is stable and SEQUENCE comes from site.json → event.calendarSequence, so a
// calendar app that RE-IMPORTS the file updates the entry (new Zoom link etc.) instead of
// adding a duplicate. Entries do not update by themselves.
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

export default class {
  data() {
    return { permalink: "/aatapestry-workshop.ics", eleventyExcludeFromCollections: true, layout: false };
  }
  render({ site, when, copy }) {
    const ev = site.event;
    const tk = (s) => applyTokens(String(s ?? ""), { site, when });
    const summary = tk((copy && copy.jsonld && copy.jsonld.eventSummary) || site.description);
    // when.js keeps each time together with no-break spaces (for the web pages); a calendar entry is plain
    // text (plain() from scripts/lib/tokens.mjs). The summary already says that Spanish and ASL
    // interpretation will be provided and event.cost mentions it again, so there is no "Interpretation:" line.
    const description = plain([
      summary,
      "",
      `When: ${when.date.long}, ${when.time.leadLong}`,
      when.time.startsAlso,
      `Zoom: ${ev.zoom.joinUrl}`,
      `Meeting ID: ${ev.zoom.meetingId}`,
      `Passcode: ${ev.zoom.passcode}`,
      ...(ev.zoom.dialIn && ev.zoom.dialIn.length ? [`Dial in: ${ev.zoom.dialIn.join(", ")}`] : []),
      "",
      ...(ev.cost ? [tk(ev.cost)] : []),
      ...(site.contact.email ? [`Questions: ${site.contact.email}`] : []),
      "",
      `Details and updates: ${site.url}`,
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
      title: ev.name,
      description,
      location: `Zoom - Meeting ID ${ev.zoom.meetingId}, passcode ${ev.zoom.passcode}`,
      url: site.url,
      status: ev.status === "cancelled" ? "CANCELLED" : ev.status === "postponed" ? "TENTATIVE" : "CONFIRMED",
      busyStatus: "BUSY",
      categories: ["A.A.", "Workshop", "Three Legacies"],
      ...(site.contact.email && site.contact.icsOrganizer === true ? { organizer: { name: site.contact.committee, email: site.contact.email } } : {}),
      alarms: [
        { action: "display", description: `${ev.name} is tomorrow`, trigger: { hours: 24, minutes: 0, before: true } },
        { action: "display", description: `${ev.name} starts in 30 minutes: ${ev.zoom.joinUrl}`, trigger: { hours: 0, minutes: 30, before: true } },
      ],
    });
    if (error) throw error;
    return foldOctets(value);
  }
}
