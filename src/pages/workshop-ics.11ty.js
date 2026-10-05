// /aatapestry-workshop.ics — the calendar invite, generated from site.json with the `ics`
// library. UID is stable and SEQUENCE comes from site.json → event.calendarSequence, so a
// calendar app that already imported the event updates it (new Zoom link etc.) instead of
// adding a duplicate.
import { createEvent } from "ics";

export default class {
  data() {
    return { permalink: "/aatapestry-workshop.ics", eleventyExcludeFromCollections: true, layout: false };
  }
  render({ site, when, copy }) {
    const ev = site.event;
    const description = [
      (copy && copy.jsonld && copy.jsonld.eventSummary) || site.description,
      "",
      `Zoom: ${ev.zoom.joinUrl}`,
      `Meeting ID: ${ev.zoom.meetingId}`,
      `Passcode: ${ev.zoom.passcode}`,
      ...(ev.zoom.dialIn && ev.zoom.dialIn.length ? [`Dial in: ${ev.zoom.dialIn.join(", ")}`] : []),
      "",
      `Interpretation: ${ev.interpretation.map((i) => i.label).join(", ")}`,
      ev.cost,
      "",
      `Details and updates: ${site.url}`,
    ].join("\n");

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
      // ASCII punctuation only: the ics library folds at 75 characters, RFC 5545 counts octets.
      location: `Zoom - Meeting ID ${ev.zoom.meetingId}, passcode ${ev.zoom.passcode}`,
      url: site.url,
      status: ev.status === "cancelled" ? "CANCELLED" : ev.status === "postponed" ? "TENTATIVE" : "CONFIRMED",
      busyStatus: "BUSY",
      categories: ["A.A.", "Workshop", "Three Legacies"],
      ...(site.contact.email ? { organizer: { name: site.contact.committee, email: site.contact.email } } : {}),
      alarms: [
        { action: "display", description: `${ev.name} is tomorrow`, trigger: { hours: 24, minutes: 0, before: true } },
        { action: "display", description: `${ev.name} starts in 30 minutes: ${ev.zoom.joinUrl}`, trigger: { hours: 0, minutes: 30, before: true } },
      ],
    });
    if (error) throw error;
    return value;
  }
}
