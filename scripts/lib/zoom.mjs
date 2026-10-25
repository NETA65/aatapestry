// Shared helpers for the two Zoom scripts (update-zoom.mjs, sync-zoom.mjs).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const siteFile = path.join(root, "src", "_data", "site.json");

export function loadSite() {
  return JSON.parse(fs.readFileSync(siteFile, "utf8"));
}
export function saveSite(site) {
  fs.writeFileSync(siteFile, JSON.stringify(site, null, 2) + "\n");
}

// "1234567890" → "123 456 7890"; 11 digits → "### #### ####" (e.g. "123 4567 8901").
export function formatMeetingId(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  if (d.length === 10) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  if (d.length === 11) return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`;
  return d;
}

export function validateJoinUrl(u) {
  const url = new URL(String(u).trim());
  if (url.protocol !== "https:" || !/(^|\.)zoom\.(us|com)$/i.test(url.hostname)) {
    throw new Error(`Join URL must be an https://…zoom.us link, got: ${u}`);
  }
  return url.href;
}

// Today's date (YYYY-MM-DD) in the event's timezone.
export function todayIn(timezone) {
  return new Date().toLocaleDateString("en-CA", { timeZone: timezone });
}

// Apply new Zoom values to site.json's event.zoom. Empty values keep what is there.
// Returns the list of fields that actually changed.
export function applyZoom(site, { meetingId, passcode, joinUrl, dialIn } = {}) {
  const z = site.event.zoom;
  const changed = [];
  if (meetingId && String(meetingId).trim()) {
    const digits = String(meetingId).replace(/\D/g, "");
    if (!/^\d{9,11}$/.test(digits)) throw new Error(`Meeting ID must be 9–11 digits, got: ${meetingId}`);
    if (formatMeetingId(digits) !== z.meetingId) {
      z.meetingId = formatMeetingId(digits);
      changed.push("meetingId");
    }
  }
  if (passcode && String(passcode).trim()) {
    const pc = String(passcode).trim();
    if (!/^[A-Za-z0-9@*_-]{1,10}$/.test(pc)) throw new Error(`Passcode must be 1–10 letters, digits or @ * _ -, got: ${pc}`);
    if (pc !== z.passcode) {
      z.passcode = pc;
      changed.push("passcode");
    }
  }
  if (joinUrl && validateJoinUrl(joinUrl) !== z.joinUrl) {
    z.joinUrl = validateJoinUrl(joinUrl);
    changed.push("joinUrl");
  }
  if (dialIn !== undefined && dialIn !== null && String(dialIn).trim() !== "") {
    const list = String(dialIn).split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
    if (JSON.stringify(list) !== JSON.stringify(z.dialIn || [])) {
      z.dialIn = list;
      changed.push("dialIn");
    }
  }
  if (changed.length) {
    z.lastUpdated = todayIn(site.event.timezone);
    // Bumping SEQUENCE lets calendar apps update an already-imported .ics instead of duplicating it.
    site.event.calendarSequence = (Number(site.event.calendarSequence) || 0) + 1;
  }
  return changed;
}

// Write `name=value` to the GitHub Actions output file when running in Actions.
export function ghOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}
