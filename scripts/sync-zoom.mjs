#!/usr/bin/env node
// OPTIONAL: pull the current join link / passcode for the meeting ID in site.json straight
// from Zoom, so the site, QR code and calendar file update themselves if the meeting changes.
// Runs daily from .github/workflows/sync-zoom.yml and only does anything when these three
// repository secrets exist (a Zoom "Server-to-Server OAuth" app, scope meeting:read:meeting
// or meeting:read:admin — see docs/SETUP-GITHUB.md):
//   ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET
import { applyZoom, loadSite, saveSite, ghOutput } from "./lib/zoom.mjs";

const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;
if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
  console.log("Zoom sync skipped: ZOOM_ACCOUNT_ID / ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET are not set.");
  ghOutput("changed", "false");
  ghOutput("summary", "skipped (no Zoom credentials)");
  process.exit(0);
}

const site = loadSite();
const meetingId = String(site.event.zoom.meetingId || "").replace(/\D/g, "");
if (!meetingId) {
  console.error("site.json has no meeting ID to look up.");
  process.exit(1);
}

async function token() {
  const res = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(ZOOM_ACCOUNT_ID)}`, {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString("base64") },
  });
  if (!res.ok) throw new Error(`Zoom OAuth failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

try {
  const t = await token();
  const res = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, { headers: { Authorization: `Bearer ${t}` } });
  if (!res.ok) throw new Error(`Zoom API /meetings/${meetingId} failed: ${res.status} ${await res.text()}`);
  const m = await res.json();
  const changed = applyZoom(site, { meetingId: m.id ? String(m.id) : undefined, passcode: m.password, joinUrl: m.join_url });
  if (changed.length) {
    saveSite(site);
    console.log(`✔ Zoom details changed (${changed.join(", ")}); site.json updated.`);
  } else {
    console.log("Zoom details unchanged.");
  }
  if (m.topic) console.log(`  Zoom topic: ${m.topic}`);
  ghOutput("changed", changed.length ? "true" : "false");
  ghOutput("summary", changed.length ? `Zoom changed: ${changed.join(", ")}` : "Zoom unchanged");
} catch (err) {
  console.error(`✖ ${err.message}`);
  ghOutput("changed", "false");
  ghOutput("summary", `error: ${err.message}`);
  process.exit(1);
}
