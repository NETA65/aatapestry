#!/usr/bin/env node
// Update the Zoom details in src/_data/site.json — from the command line or from the
// "Update Zoom info" GitHub Actions form (.github/workflows/update-zoom.yml).
//
//   node scripts/update-zoom.mjs --meeting-id "701 778 5951" --passcode 446920 \
//        --join-url "https://us02web.zoom.us/j/7017785951?pwd=…" [--dial-in "+1 669 900 6833, +1 346 248 7799"]
//
// Empty values keep what is already there. The same values can be passed as environment
// variables MEETING_ID, PASSCODE, JOIN_URL, DIAL_IN (how the workflow passes form input safely).
import { applyZoom, loadSite, saveSite, ghOutput } from "./lib/zoom.mjs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const input = {
  meetingId: flag("meeting-id") ?? process.env.MEETING_ID,
  passcode: flag("passcode") ?? process.env.PASSCODE,
  joinUrl: flag("join-url") ?? process.env.JOIN_URL,
  dialIn: flag("dial-in") ?? process.env.DIAL_IN,
};

const site = loadSite();
let changed;
try {
  changed = applyZoom(site, input);
} catch (err) {
  console.error(`✖ ${err.message}`);
  ghOutput("changed", "false");
  process.exit(1);
}

if (changed.length) {
  saveSite(site);
  console.log(`✔ Updated ${changed.join(", ")} in src/_data/site.json`);
  console.log(`  Meeting ID ${site.event.zoom.meetingId} · passcode ${site.event.zoom.passcode}`);
  console.log(`  ${site.event.zoom.joinUrl}`);
  console.log(`  calendarSequence → ${site.event.calendarSequence}, lastUpdated → ${site.event.zoom.lastUpdated}`);
} else {
  console.log("Nothing to change — the Zoom details are already up to date.");
}
ghOutput("changed", changed.length ? "true" : "false");
ghOutput("summary", changed.length ? `Updated ${changed.join(", ")}` : "No change");
