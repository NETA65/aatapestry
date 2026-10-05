#!/usr/bin/env node
// Generates the primary mark — the A.A. circle-and-triangle, with the Three Legacies named on
// the three sides (Unity · Service · Recovery) and a three-circle Venn diagram woven inside —
// from pure geometry, so it is exact, reproducible and editable by changing the numbers below.
//
//   brand/src/mark.svg         colour, with the three words (the main mark)
//   brand/src/mark-plain.svg   colour, no words (favicons and very small sizes)
//   brand/src/mark-mono.svg    one colour (ink), with words
//
// Every Venn region is an explicit flat shape (no transparency, no blend modes), so the files print
// exactly on any press and convert cleanly to PDF. The words are outlined with the site's own fonts.
// Run: node scripts/make-aa-mark.mjs   (then `npm run build:brand` to regenerate every derived file)
import fs from "node:fs";
import path from "node:path";
import { root, loadFont, layout, textWidth } from "./lib/text.mjs";

const site = JSON.parse(fs.readFileSync(path.join(root, "src/_data/site.json"), "utf8"));
const INK = site.brand.ink;
const L = Object.fromEntries(site.legacies.map((l) => [l.key, l]));
const HUE = { recovery: L.recovery.color, unity: L.unity.color, service: L.service.color };
const TEXT = { recovery: L.recovery.colorText, unity: L.unity.colorText, service: L.service.colorText };
// Between-hues where two legacies overlap, and the colour where all three meet.
const MIX = { "recovery+unity": "#2A7DAA", "unity+service": "#5E9A3A", "recovery+service": "#7F4E8C" };
const CORE = "#3D3160";

const S = 1024, cx = 512, cy = 512;
const n2 = (v) => Math.round(v * 100) / 100;
const SIN60 = Math.sqrt(3) / 2;

// ---------- Venn: split three circles into their seven flat regions ----------
function vennRegions(circles) {
  const n = circles.length;
  const inside = (p, c) => Math.hypot(p.x - c.x, p.y - c.y) < c.r - 1e-6;
  const pts = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = circles[i], b = circles[j];
    const dx = b.x - a.x, dy = b.y - a.y, s = Math.hypot(dx, dy);
    const aa = (a.r * a.r - b.r * b.r + s * s) / (2 * s);
    const h = Math.sqrt(Math.max(0, a.r * a.r - aa * aa));
    const mx = a.x + (aa * dx) / s, my = a.y + (aa * dy) / s;
    pts.push({ x: mx + (h * -dy) / s, y: my + (h * dx) / s, on: [i, j] }, { x: mx - (h * -dy) / s, y: my - (h * dx) / s, on: [i, j] });
  }
  const arcs = [];
  for (let i = 0; i < n; i++) {
    const c = circles[i];
    const angs = pts.filter((p) => p.on.includes(i)).map((p) => Math.atan2(p.y - c.y, p.x - c.x)).sort((a, b) => a - b);
    for (let k = 0; k < angs.length; k++) {
      const a0 = angs[k], a1 = k + 1 < angs.length ? angs[k + 1] : angs[0] + 2 * Math.PI;
      const am = (a0 + a1) / 2;
      const mid = { x: c.x + c.r * Math.cos(am), y: c.y + c.r * Math.sin(am) };
      arcs.push({ ci: i, a0, a1, member: circles.map((o, j) => (j === i ? null : inside(mid, o))) });
    }
  }
  const at = (a, ang) => { const c = circles[a.ci]; return { x: c.x + c.r * Math.cos(ang), y: c.y + c.r * Math.sin(ang) }; };
  const near = (p, q) => Math.hypot(p.x - q.x, p.y - q.y) < 0.5;
  const arcCmd = (a, dir) => {
    const c = circles[a.ci], large = a.a1 - a.a0 > Math.PI ? 1 : 0, sweep = dir === 1 ? 1 : 0;
    const end = at(a, dir === 1 ? a.a1 : a.a0);
    return `A${n2(c.r)} ${n2(c.r)} 0 ${large} ${sweep} ${n2(end.x)} ${n2(end.y)}`;
  };
  const regions = [];
  for (let mask = 1; mask < 1 << n; mask++) {
    const want = circles.map((_, j) => !!(mask & (1 << j)));
    const bound = arcs.filter((a) => circles.every((_, j) => j === a.ci || a.member[j] === want[j]));
    if (!bound.length) continue;
    const used = new Set();
    let d = "";
    while (used.size < bound.length) {
      const first = bound.findIndex((_, i) => !used.has(i));
      const a = bound[first];
      used.add(first);
      const start = at(a, a.a0);
      let cur = at(a, a.a1);
      d += `M${n2(start.x)} ${n2(start.y)}${arcCmd(a, 1)}`;
      let guard = 0;
      while (!near(cur, start) && guard++ < 12) {
        const ni = bound.findIndex((b, i) => !used.has(i) && (near(at(b, b.a0), cur) || near(at(b, b.a1), cur)));
        if (ni < 0) break;
        const b = bound[ni];
        used.add(ni);
        const dir = near(at(b, b.a0), cur) ? 1 : -1;
        d += arcCmd(b, dir);
        cur = at(b, dir === 1 ? b.a1 : b.a0);
      }
      d += "Z";
    }
    regions.push({ keys: circles.filter((_, j) => want[j]).map((c) => c.key), d });
  }
  return regions;
}

// ---------- one mark ----------
function mark({ labels = true, mono = false, font }) {
  const Rt = labels ? 392 : 400; // triangle circumradius
  const ty = cy - 22; // the triangle sits a touch above the ring centre (optical balance under the base word)
  const ri = Rt / 2; // inradius
  const stroke = labels ? 26 : 30;
  const apex = { x: cx, y: ty - Rt }, left = { x: cx - Rt * SIN60, y: ty + Rt / 2 }, right = { x: cx + Rt * SIN60, y: ty + Rt / 2 };
  // One circle per legacy, each tucked against its own side (bottom = Recovery, left = Unity, right = Service).
  const r = 0.3 * Rt, d = 0.17 * Rt;
  const dirs = { recovery: { x: 0, y: 1 }, unity: { x: -SIN60, y: -0.5 }, service: { x: SIN60, y: -0.5 } };
  const circles = ["recovery", "unity", "service"].map((key) => ({ key, x: cx + d * dirs[key].x, y: ty + d * dirs[key].y, r }));
  const col = (keys) => (keys.length === 3 ? CORE : keys.length === 2 ? MIX[[...keys].sort().join("+")] || MIX[keys.join("+")] : HUE[keys[0]]);

  let out = "";
  out += `<circle cx="${cx}" cy="${cy}" r="468" fill="none" stroke="${INK}" stroke-width="26"/>`;
  out += `<circle cx="${cx}" cy="${cy}" r="441" fill="none" stroke="${INK}" stroke-width="4" stroke-dasharray="5 11" stroke-linecap="round"/>`;
  if (mono) {
    for (const c of circles) out += `<circle cx="${n2(c.x)}" cy="${n2(c.y)}" r="${n2(c.r)}" fill="none" stroke="${INK}" stroke-width="9"/>`;
    const core = vennRegions(circles).find((g) => g.keys.length === 3);
    if (core) out += `<path d="${core.d}" fill="${INK}"/>`;
  } else {
    for (const g of vennRegions(circles)) out += `<path d="${g.d}" fill="${col(g.keys)}"/>`;
  }
  const side = (a, b, key) => `<line x1="${n2(a.x)}" y1="${n2(a.y)}" x2="${n2(b.x)}" y2="${n2(b.y)}" stroke="${mono ? INK : HUE[key]}" stroke-width="${stroke}" stroke-linecap="round"/>`;
  out += side(left, apex, "unity") + side(apex, right, "service") + side(right, left, "recovery");
  // rounded corner joins (so the three colours meet cleanly)
  for (const v of [apex, left, right]) out += `<circle cx="${n2(v.x)}" cy="${n2(v.y)}" r="${stroke / 2 + 3}" fill="${INK}"/>`;

  if (labels) {
    const size = 60, ls = 0.16;
    const word = (text, key, px, py, rot, baselineDist) => {
      const w = textWidth(font, text, size, { letterSpacing: ls });
      const { d: pd } = layout(font, text, -w / 2, 0, size, { letterSpacing: ls });
      return `<g transform="translate(${n2(px)} ${n2(py)}) rotate(${rot})"><path d="${pd}" fill="${mono ? INK : TEXT[key]}"/></g>`;
    };
    const bl = ri + stroke / 2 + 14; // baseline just outside the side for the side-reading words (tops face outward)
    out += word("UNITY", "unity", cx + bl * dirs.unity.x, ty + bl * dirs.unity.y, -60);
    out += word("SERVICE", "service", cx + bl * dirs.service.x, ty + bl * dirs.service.y, 60);
    out += word("RECOVERY", "recovery", cx, ty + ri + stroke / 2 + 14 + size * 0.73, 0); // upright, caps top just under the base
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">\n${out}\n</svg>\n`;
}

const font = await loadFont("@fontsource/inter/files/inter-latin-800-normal.woff2");
const outDir = path.join(root, "brand", "src");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "mark.svg"), mark({ labels: true, font }));
fs.writeFileSync(path.join(outDir, "mark-plain.svg"), mark({ labels: false, font }));
fs.writeFileSync(path.join(outDir, "mark-mono.svg"), mark({ labels: true, mono: true, font }));
fs.writeFileSync(path.join(outDir, "mark-plain-mono.svg"), mark({ labels: false, mono: true, font }));
console.log("✔ wrote brand/src/mark.svg, mark-plain.svg, mark-mono.svg, mark-plain-mono.svg");
