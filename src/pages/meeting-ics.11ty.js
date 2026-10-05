// /36-principles-meeting.ics — a recurring weekly invite for the 36 Principles meeting.
// Only written once meeting.json has published: true and a weekday + time.
import { createEvent } from "ics";
import { DateTime } from "luxon";

export default class {
  data() {
    return {
      eleventyExcludeFromCollections: true,
      layout: false,
      eleventyComputed: {
        permalink: (data) => (data.meeting.published && data.focus.configured ? "/36-principles-meeting.ics" : false),
      },
    };
  }
  render({ site, meeting, focus }) {
    if (!focus.next) return "";
    const start = DateTime.fromISO(focus.next.iso).toUTC();
    const end = start.plus({ minutes: meeting.durationMinutes || 60 });
    const arr = (d) => [d.year, d.month, d.day, d.hour, d.minute];
    const description = [
      meeting.description,
      "",
      ...(meeting.zoom.joinUrl ? [`Zoom: ${meeting.zoom.joinUrl}`, `Meeting ID: ${meeting.zoom.meetingId}`, ...(meeting.zoom.passcode ? [`Passcode: ${meeting.zoom.passcode}`] : []), ""] : []),
      `Study pages and this week's focus: ${site.url}/meeting/`,
    ].join("\n");
    const { error, value } = createEvent({
      uid: `36-principles-meeting@${site.domain}`,
      productId: `${site.domain}//meeting`,
      calName: meeting.name,
      start: arr(start),
      startInputType: "utc",
      startOutputType: "utc",
      end: arr(end),
      endInputType: "utc",
      endOutputType: "utc",
      title: meeting.name,
      description,
      location: meeting.zoom.joinUrl ? `Zoom — Meeting ID ${meeting.zoom.meetingId}` : "Zoom",
      url: `${site.url}/meeting/`,
      recurrenceRule: focus.rrule,
      status: "CONFIRMED",
      busyStatus: "BUSY",
      categories: ["A.A.", "Meeting", "36 Principles"],
      alarms: [{ action: "display", description: `${meeting.name} starts in 15 minutes`, trigger: { hours: 0, minutes: 15, before: true } }],
    });
    if (error) throw error;
    return value;
  }
}
