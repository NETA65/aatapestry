#!/usr/bin/env node
// The website's logo: the primary mark (brand/src/mark.svg, mark-plain.svg) recoloured the way the
// official flyer shows it — a dark disc with the triangle, its three words and the Venn circles in
// bright legacy colours. brand/ is only read, never written.
//
//   src/assets/img/logo.svg         with the words Unity · Service · Recovery (hero, 404, social)
//   src/assets/img/logo-plain.svg   without the words (header and footer, where they could not be read)
//
// Run: node scripts/make-site-logo.mjs   (after `npm run brand:mark` if the mark itself changed)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DISC = "#0B0F1E";
const RING = "#2C3658";
const STITCH = "#7C86A8";
// brand colour → flyer colour (lines, words, Venn regions)
const MAP = {
  "#2F4FA2": "#4479F5", // Recovery
  "#1B8A6B": "#2FBF77", // Unity
  "#156B53": "#3BD285", // Unity word
  "#D9941F": "#F5AA2C", // Service
  "#8A5A0B": "#F5AA2C", // Service word
  "#2A7DAA": "#2B9CC8", // Recovery + Unity
  "#5E9A3A": "#93C23C", // Unity + Service
  "#7F4E8C": "#9B5CDB", // Service + Recovery
  "#3D3160": "#5B3FB4", // all three
};

function flyerize(svg) {
  let s = svg.replace(/<\?xml[^>]*>/, "").trim();
  // The outer ring (first stroked circle) and the stitched ring (second), then the vertex dots.
  let ring = 0;
  s = s.replace(/<circle([^>]*?)stroke="#1F2233"([^>]*)\/>/g, (m, a, b) => `<circle${a}stroke="${ring++ === 0 ? RING : STITCH}"${b}/>`);
  s = s.replace(/fill="#1F2233"/g, `fill="${DISC}"`);
  for (const [from, to] of Object.entries(MAP)) s = s.replace(new RegExp(`(fill|stroke)="${from}"`, "gi"), `$1="${to}"`);
  // The dark disc behind everything (outer ring radius 468 + half its stroke).
  return s.replace(/(<svg[^>]*>)/, `$1<circle cx="512" cy="512" r="481" fill="${DISC}"/>`) + "\n";
}

const out = path.join(root, "src/assets/img");
fs.mkdirSync(out, { recursive: true });
for (const [src, dest] of [["mark.svg", "logo.svg"], ["mark-plain.svg", "logo-plain.svg"]]) {
  const svg = fs.readFileSync(path.join(root, "brand/src", src), "utf8");
  fs.writeFileSync(path.join(out, dest), flyerize(svg));
  console.log(`✔ src/assets/img/${dest}`);
}
