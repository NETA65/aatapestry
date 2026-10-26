#!/usr/bin/env node
// The social cards (link previews): src/assets/img/og.png (English) and og-es.png (Spanish), 1200 × 630.
// Every page's <head> points at them (src/_includes/partials/head.njk; ogImage in pages.11tydata.js).
//
// A flyer-style card drawn with HTML/CSS and photographed by headless Chrome (Puppeteer, like
// scripts/pdf.mjs): the navy "thread" background, the logo, the gold THE INCREDIBLE over the cream
// script Tapestry, "A 1-day online A.A. workshop", the gold date ribbon, the time bar (ET first, then
// PT · MT · CT, like the flyer) and "Online on Zoom · Spanish & ASL interpretation · Free".
//
// Everything comes from data, so re-run it whenever the date, the times or the wording change:
//   site.json                       the name, the date and time (through when.js)
//   src/_data/when.js               the formatted date and times (EN/ES)
//   src/_data/i18n.json             landing.eyebrow, landing.gloss, labels.online / interpretationBadge / free
//   src/_data/pagecopy/home.json    hero.the / incredible / tapestry (the title lettering)
// Fonts are the self-hosted @fontsource files (Playfair Display 900, Great Vibes, Fraunces, Inter);
// the logo is src/assets/img/logo.svg and the braid src/assets/img/braid.svg. No network access.
//
// The PNGs are written with a 256-colour palette (quantized here, no extra dependency): a truecolour
// screenshot of the card is ~450 KB, and WhatsApp skips link-preview images over ~300 KB.
//
//   npm run brand:og                    (= node scripts/make-og.mjs) write both cards
//   node scripts/make-og.mjs --html     also save the HTML used to .cache/og/ (git-ignored), for tweaking
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer";
import { applyTokens, plain } from "./lib/tokens.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (...p) => path.join(root, ...p);
const readJson = (p) => JSON.parse(fs.readFileSync(rel(p), "utf8"));

const site = readJson("src/_data/site.json");
const { default: when } = await import(pathToFileURL(rel("src/_data/when.js")).href);
const i18n = readJson("src/_data/i18n.json");
const home = readJson("src/_data/pagecopy/home.json");

const W = 1200, H = 630;
const OUT = { en: rel("src/assets/img/og.png"), es: rel("src/assets/img/og-es.png") };
const saveHtml = process.argv.includes("--html");

// ---------- data ----------
// A string from a dictionary (dotted path), with its {tokens} filled in and the web-only no-break
// characters turned back into plain spaces (the card sets its own no-wrap rules).
const get = (obj, keyPath) => keyPath.split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), obj);
const str = (v, fallback = "") => (typeof v === "string" && v.trim() ? plain(applyTokens(v, { site, when })) : fallback);
const tr = (lang, keyPath, fallback) => str(get(i18n[lang], keyPath), str(get(i18n.en, keyPath), fallback));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function cardText(lang) {
  const es = lang === "es";
  const hero = (home[lang] && home[lang].hero) || home.en.hero || {};
  return {
    lang,
    the: str(hero.the, "The"),
    incredible: str(hero.incredible, "Incredible"),
    tapestry: str(hero.tapestry, "Tapestry"),
    gloss: tr(lang, "landing.gloss", ""), // "El Increíble Tapiz" (Spanish only)
    overline: tr(lang, "landing.eyebrow", "A 1-day online A.A. workshop"),
    date: plain(es ? cap(when.date.longEs) : when.date.long),
    range: plain(es ? when.time.rangeEs : when.time.range), // 11:00 AM – 7:00 PM
    tz: when.tzShort, // ET
    also: when.also.map((a) => ({ time: plain(es ? a.startEs : a.start), zone: a.short })), // 8:00 AM PT …
    facts: [
      { icon: "video", text: tr(lang, "labels.online", "Online on Zoom") },
      { icon: "languages", text: tr(lang, "labels.interpretationBadge", "Spanish & ASL interpretation") },
      { icon: "heart-handshake", text: tr(lang, "labels.free", "Free") },
    ],
  };
}

// ---------- assets ----------
const fontUrl = (file) => `data:font/woff2;base64,${fs.readFileSync(rel("node_modules/@fontsource", file)).toString("base64")}`;
const FONTS = [
  ["Playfair Display", 900, "normal", "playfair-display/files/playfair-display-latin-900-normal.woff2"],
  ["Great Vibes", 400, "normal", "great-vibes/files/great-vibes-latin-400-normal.woff2"],
  ["Fraunces", 600, "normal", "fraunces/files/fraunces-latin-600-normal.woff2"],
  ["Fraunces", 500, "italic", "fraunces/files/fraunces-latin-500-italic.woff2"],
  ["Inter", 600, "normal", "inter/files/inter-latin-600-normal.woff2"],
];
const fontFaces = FONTS.map(([family, weight, style, file]) => `@font-face{font-family:"${family}";font-weight:${weight};font-style:${style};src:url(${fontUrl(file)}) format("woff2");}`).join("\n");
const svgFile = (p) => fs.readFileSync(rel(p), "utf8").replace(/<\?xml[^>]*>/, "").replace(/<!--[\s\S]*?-->/g, "").trim();
const icon = (name) => svgFile(`node_modules/lucide-static/icons/${name}.svg`).replace(/<svg[^>]*>/, (m) => m.replace(/\s(class|width|height)="[^"]*"/g, "").replace("<svg", '<svg class="i" aria-hidden="true"'));
const logo = svgFile("src/assets/img/logo.svg");
const braid = svgFile("src/assets/img/braid.svg");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---------- the card ----------
function cardHtml(c) {
  return `<!doctype html>
<html lang="${c.lang}">
<head>
<meta charset="utf-8">
<title>${esc(site.name)} — social card (${c.lang})</title>
<style>
${fontFaces}
:root {
  --navy: #0b0f1e; --cream: #fbf5e9;
  --gold-300: #f8db8f; --gold-400: #f2c35b; --gold-500: #e2a93b;
  --blue: #4479f5; --green: #2fbf77; --orange: #f5aa2c; --purple: #9b5cdb;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: var(--navy); }
body { -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision; color: var(--cream); font-family: "Inter", sans-serif; }

/* The navy "thread" background of the site's dark bands (.thread-bg), a little richer for a small preview. */
.card {
  position: relative; width: ${W}px; height: ${H}px; overflow: hidden; isolation: isolate;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 24px 44px 32px;
  background:
    radial-gradient(60% 85% at 92% -12%, rgb(68 121 245 / 0.42), transparent 62%),
    radial-gradient(55% 85% at -6% 112%, rgb(155 92 219 / 0.42), transparent 62%),
    radial-gradient(42% 60% at 106% 108%, rgb(245 170 44 / 0.26), transparent 62%),
    radial-gradient(40% 50% at 8% -6%, rgb(47 191 119 / 0.16), transparent 62%),
    var(--navy);
}
.card::before {
  content: ""; position: absolute; inset: 0; z-index: -1;
  background:
    repeating-linear-gradient(45deg, rgb(251 245 233 / 0.045) 0 2px, transparent 2px 14px),
    repeating-linear-gradient(-45deg, rgb(251 245 233 / 0.03) 0 2px, transparent 2px 14px);
}
/* The four thread colours along the bottom edge, like the flyer's yarn. */
.card::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 8px;
  background: linear-gradient(90deg, var(--blue) 0 25%, var(--green) 25% 50%, var(--orange) 50% 75%, var(--purple) 75% 100%);
}

/* ---- Top: logo + title ---- */
.top { display: flex; align-items: center; justify-content: center; gap: 34px; width: 100%; }
.logo { width: 236px; height: 236px; flex: none; filter: drop-shadow(0 12px 28px rgb(0 0 0 / 0.6)); }
.logo svg { display: block; width: 100%; height: 100%; }
.title { display: flex; flex-direction: column; align-items: center; }
.lockup { display: flex; flex-direction: column; align-items: center; line-height: 1; font-size: 104px; white-space: nowrap; }
.card--gloss .lockup { font-size: 96px; } /* room for the Spanish gloss under the title */
.the, .incredible { font-family: "Playfair Display", serif; font-weight: 900; text-transform: uppercase; font-variant-numeric: lining-nums; }
.the { font-size: 0.31em; letter-spacing: 0.22em; padding-left: 0.22em; margin-bottom: 0.05em; }
.incredible { font-size: 1em; line-height: 0.92; }
.tapestry {
  font-family: "Great Vibes", cursive; font-size: 1.36em; line-height: 0.8; margin-top: -0.2em; padding-inline: 0.15em;
  color: var(--cream); text-shadow: 0 0.04em 0.12em rgb(0 0 0 / 0.6);
}
.gold {
  background: linear-gradient(180deg, #fff0bf 0%, #f6cf6e 34%, #d39a35 60%, #f3cf7a 88%, #c58a2b 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 2px 0 rgb(0 0 0 / 0.5));
}
.gloss { margin-top: 2px; font-family: "Fraunces", serif; font-style: italic; font-weight: 500; font-size: 30px; line-height: 1.1; color: rgb(251 245 233 / 0.9); }
.braid { display: block; width: 560px; height: 28px; margin-top: 8px; }
.braid svg { display: block; width: 100%; height: 100%; }

/* ---- Middle: what, when ---- */
.overline {
  margin-top: 12px; white-space: nowrap;
  font-family: "Playfair Display", serif; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em;
  font-size: 36px; font-variant-numeric: lining-nums; line-height: 1.1; color: var(--cream); text-shadow: 0 2px 10px rgb(0 0 0 / 0.5);
}
.ribbon {
  margin-top: 16px; padding: 10px 46px 12px; white-space: nowrap;
  font-family: "Playfair Display", serif; font-weight: 900; text-transform: uppercase; letter-spacing: 0.01em;
  font-variant-numeric: lining-nums; font-size: 46px; line-height: 1.05; color: var(--navy);
  background: linear-gradient(180deg, #ffe3a0, var(--gold-400) 55%, #e7ab45);
  clip-path: polygon(1.5% 12%, 6% 0, 40% 6%, 72% 0, 97% 5%, 100% 30%, 98.5% 62%, 100% 92%, 93% 100%, 60% 94%, 28% 100%, 3% 95%, 0 70%, 1% 40%);
  filter: drop-shadow(0 8px 18px rgb(0 0 0 / 0.45));
}
.bar {
  margin-top: 18px; display: flex; align-items: stretch; white-space: nowrap;
  border: 2px solid rgb(100 160 255 / 0.6); border-radius: 18px;
  background: rgb(7 10 20 / 0.72); box-shadow: 0 0 30px -6px rgb(68 121 245 / 0.55);
}
.bar-main {
  display: flex; align-items: center; padding: 8px 22px 10px;
  font-family: "Playfair Display", serif; font-weight: 900; font-variant-numeric: lining-nums;
  font-size: 40px; line-height: 1.1; color: var(--cream);
}
.bar-zone {
  display: flex; align-items: center; padding: 8px 18px 10px;
  border-left: 2px solid var(--gold-500);
  font-family: "Fraunces", serif; font-weight: 600; font-size: 30px; line-height: 1.1; color: var(--cream);
}
.bar-zone:first-of-type { border-left-color: rgb(251 245 233 / 0.2); }
.bar-zone small { font-family: "Inter", sans-serif; font-weight: 600; font-size: 22px; letter-spacing: 0.04em; color: var(--gold-300); }

/* ---- Bottom: where, interpretation, cost ---- */
.facts { margin-top: 18px; display: flex; align-items: center; gap: 12px; list-style: none; white-space: nowrap; }
.fact {
  display: flex; align-items: center; gap: 10px; padding: 7px 18px 7px 14px; border-radius: 999px;
  background: rgb(251 245 233 / 0.1); border: 1.5px solid rgb(251 245 233 / 0.22);
  font-size: 28px; font-weight: 600; line-height: 1.2; color: var(--cream);
}
.fact .i { width: 30px; height: 30px; flex: none; color: var(--gold-300); stroke-width: 2.2; }
</style>
</head>
<body>
<div class="card${c.gloss ? " card--gloss" : ""}" id="card">
  <div class="top">
    <div class="logo">${logo}</div>
    <div class="title">
      <div class="lockup" data-fit="720">
        <span class="the gold">${esc(c.the)}</span>
        <span class="incredible gold">${esc(c.incredible)}</span>
        <span class="tapestry">${esc(c.tapestry)}</span>
      </div>
      ${c.gloss ? `<p class="gloss" lang="es">${esc(c.gloss)}</p>` : ""}
      <div class="braid">${braid}</div>
    </div>
  </div>
  <p class="overline" data-fit="1100">${esc(c.overline)}</p>
  <p class="ribbon" data-fit="1100">${esc(c.date)}</p>
  <div class="bar" data-fit="1110">
    <span class="bar-main">${esc(c.range)}&nbsp;${esc(c.tz)}</span>
    ${c.also.map((a) => `<span class="bar-zone"><span>${esc(a.time)}&nbsp;<small>${esc(a.zone)}</small></span></span>`).join("")}
  </div>
  <ul class="facts" data-fit="1110">
    ${c.facts.map((f) => `<li class="fact">${icon(f.icon)}<span>${esc(f.text)}</span></li>`).join("")}
  </ul>
</div>
</body>
</html>`;
}

// Shrink any [data-fit="px"] element (by its font size, so everything inside scales together) until it
// is no wider than px, then check that the whole card fits in 1200 × 630.
async function fitAndCheck(page) {
  return page.evaluate(() => {
    for (const el of document.querySelectorAll("[data-fit]")) {
      const max = Number(el.dataset.fit);
      let guard = 0;
      while (el.getBoundingClientRect().width > max && guard++ < 200) {
        if (el.matches(".bar, .facts")) {
          // These hold several differently-sized pieces: scale each piece's font size together.
          for (const k of el.querySelectorAll(".bar-main, .bar-zone, .bar-zone small, .fact")) {
            k.style.fontSize = `${parseFloat(getComputedStyle(k).fontSize) * 0.98}px`;
          }
        } else {
          el.style.fontSize = `${parseFloat(getComputedStyle(el).fontSize) * 0.98}px`;
        }
      }
    }
    const card = document.getElementById("card").getBoundingClientRect();
    const problems = [];
    for (const el of document.querySelectorAll(".card > *")) {
      const r = el.getBoundingClientRect();
      if (r.left < card.left || r.right > card.right || r.top < card.top + 10 || r.bottom > card.bottom - 10) problems.push(`${el.className}: x ${Math.round(r.left)}–${Math.round(r.right)}, y ${Math.round(r.top)}–${Math.round(r.bottom)}`);
    }
    return problems;
  });
}

// ---------- 256-colour PNG ----------
// 1. Flat colours go into the palette exactly, so solid areas (the logo's segments and overlaps, the
//    ribbon, the chips, the navy) stay clean: a colour is flat when it fills the inside of a region
//    (pixels equal to their left and upper neighbours); near-duplicates of a chosen one are skipped.
// 2. Median cut fills the rest of the palette: the box of colours with the largest (pixel-weighted)
//    squared error is split at its weighted median along its widest channel.
// 3. Every pixel takes its nearest palette colour, with gentle Floyd–Steinberg dithering for the glows
//    and the gold gradient (a pixel whose colour is in the palette carries no error, so flat areas stay flat).
const WEIGHT = [2, 4, 3]; // rough perceptual weights for R, G, B
const dist = (a, b) => WEIGHT[0] * (a[0] - b[0]) ** 2 + WEIGHT[1] * (a[1] - b[1]) ** 2 + WEIGHT[2] * (a[2] - b[2]) ** 2;
function quantize(rgba, w, { maxColors = 256, maxExact = 96, minInterior = 60, dither = 0.75 } = {}) {
  const counts = new Map(), interior = new Map();
  const keyAt = (p) => (rgba[p * 4] << 16) | (rgba[p * 4 + 1] << 8) | rgba[p * 4 + 2];
  for (let p = 0; p < rgba.length / 4; p++) {
    const key = keyAt(p);
    counts.set(key, (counts.get(key) || 0) + 1);
    if (p % w > 0 && p >= w && keyAt(p - 1) === key && keyAt(p - w) === key) interior.set(key, (interior.get(key) || 0) + 1);
  }
  const colors = [...counts].map(([key, n]) => [(key >> 16) & 255, (key >> 8) & 255, key & 255, n, key]);
  const exact = [];
  for (const c of colors.filter((c) => (interior.get(c[4]) || 0) >= minInterior).sort((a, b) => interior.get(b[4]) - interior.get(a[4]))) {
    if (exact.length >= maxExact) break;
    if (!exact.some((e) => dist(e, c) < 150)) exact.push([c[0], c[1], c[2]]);
  }
  maxColors -= exact.length;
  const box = (items) => {
    let n = 0;
    const sum = [0, 0, 0], sq = [0, 0, 0];
    for (const c of items) {
      n += c[3];
      for (let j = 0; j < 3; j++) { sum[j] += c[j] * c[3]; sq[j] += c[j] * c[j] * c[3]; }
    }
    const err = sq.map((s, j) => (s - (sum[j] * sum[j]) / n) * WEIGHT[j]); // weighted squared error per channel
    return { items, n, mean: sum.map((s) => s / n), axis: err.indexOf(Math.max(...err)), err: err[0] + err[1] + err[2] };
  };
  const boxes = [box(colors)];
  while (boxes.length < maxColors) {
    let bi = -1;
    for (let i = 0; i < boxes.length; i++) if (boxes[i].items.length > 1 && (bi < 0 || boxes[i].err > boxes[bi].err)) bi = i;
    if (bi < 0 || boxes[bi].err <= 0) break;
    const { items, n, axis } = boxes[bi];
    items.sort((p, q) => p[axis] - q[axis]);
    let acc = 0, cut = 1;
    for (let i = 0; i < items.length - 1; i++) { acc += items[i][3]; if (acc >= n / 2) { cut = i + 1; break; } }
    boxes.splice(bi, 1, box(items.slice(0, cut)), box(items.slice(cut)));
  }
  const palette = [...exact, ...boxes.map((b) => b.mean.map(Math.round))];
  const cache = new Map();
  const nearest = (r, g, b) => {
    const key = (r << 16) | (g << 8) | b;
    let best = cache.get(key);
    if (best !== undefined) return best;
    let bestD = Infinity;
    for (let i = 0; i < palette.length; i++) {
      const p = palette[i];
      const d = WEIGHT[0] * (r - p[0]) ** 2 + WEIGHT[1] * (g - p[1]) ** 2 + WEIGHT[2] * (b - p[2]) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    }
    cache.set(key, best);
    return best;
  };
  // Floyd–Steinberg, serpentine, at reduced strength: smooths the glows and the gold gradient without
  // speckling the flat areas (a colour that is in the palette carries no error).
  const h = rgba.length / 4 / w;
  const px = new Uint8Array(w * h);
  let cur = new Float32Array((w + 2) * 3), next = new Float32Array((w + 2) * 3);
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
  const spread = (buf, x, er, eg, eb, f) => { const k = (x + 1) * 3; buf[k] += er * f; buf[k + 1] += eg * f; buf[k + 2] += eb * f; };
  for (let y = 0; y < h; y++) {
    const dir = y % 2 === 0 ? 1 : -1;
    for (let n = 0; n < w; n++) {
      const x = dir > 0 ? n : w - 1 - n;
      const i = (y * w + x) * 4, e = (x + 1) * 3;
      const r = clamp(rgba[i] + cur[e]), g = clamp(rgba[i + 1] + cur[e + 1]), b = clamp(rgba[i + 2] + cur[e + 2]);
      const idx = nearest(r, g, b);
      px[y * w + x] = idx;
      const p = palette[idx];
      const er = (r - p[0]) * dither, eg = (g - p[1]) * dither, eb = (b - p[2]) * dither;
      if (er || eg || eb) {
        spread(cur, x + dir, er, eg, eb, 7 / 16);
        spread(next, x - dir, er, eg, eb, 3 / 16);
        spread(next, x, er, eg, eb, 5 / 16);
        spread(next, x + dir, er, eg, eb, 1 / 16);
      }
    }
    [cur, next] = [next, cur];
    next.fill(0);
  }
  return { palette, px };
}

// A minimal PNG writer for an 8-bit indexed image (IHDR, PLTE, IDAT, IEND).
const CRC_TABLE = Int32Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (const b of buf) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const len = Buffer.alloc(4), crc = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
function indexedPng(w, h, { palette, px }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 3; // 8 bits per index, colour type 3 (palette); compression, filter, interlace: 0
  const raw = Buffer.alloc((w + 1) * h); // each row: filter type 0, then its indices
  for (let y = 0; y < h; y++) raw.set(px.subarray(y * w, (y + 1) * w), y * (w + 1) + 1);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("PLTE", Buffer.from(palette.flat())),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Like scripts/pdf.mjs: if Chrome cannot start (rare, e.g. in a bare CI image), keep the committed
// cards and do not fail the build. Any other problem (a font, a card that does not fit) does fail.
let browser;
try {
  browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none", "--disable-gpu"] });
} catch (e) {
  console.warn(`⚠ social cards not regenerated (Chrome did not start: ${e.message.split("\n")[0]}); the committed og.png / og-es.png stay as they are.`);
  process.exit(0);
}
// When the site is already built, refresh its copies too (the build copied the old ones).
const builtImg = rel("_site", "assets", "img");
try {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  for (const lang of ["en", "es"]) {
    const html = cardHtml(cardText(lang));
    if (saveHtml) {
      const f = rel(".cache/og", `og${lang === "es" ? "-es" : ""}.html`);
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, html);
    }
    await page.setContent(html, { waitUntil: "load" });
    // Load every face before measuring (a fallback font would fit differently and look wrong).
    const failed = await page.evaluate(async () => {
      const faces = [...document.fonts];
      await Promise.allSettled(faces.map((f) => f.load()));
      await document.fonts.ready;
      return faces.filter((f) => f.status !== "loaded").map((f) => `${f.family} ${f.weight} ${f.style}`);
    });
    if (failed.length) throw new Error(`Fonts failed to load: ${failed.join(", ")}`);
    const problems = await fitAndCheck(page);
    if (problems.length) throw new Error(`The ${lang} card does not fit in ${W} × ${H}:\n  - ${problems.join("\n  - ")}`);
    const shot = await page.screenshot({ type: "png", encoding: "base64", clip: { x: 0, y: 0, width: W, height: H } });
    // The screenshot's pixels, decoded by the same browser (no PNG library needed).
    const rgba = Buffer.from(await page.evaluate(async (b64, w, h) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, w, h).data;
      let s = "";
      for (let i = 0; i < d.length; i += 0x8000) s += String.fromCharCode.apply(null, d.subarray(i, i + 0x8000));
      return btoa(s);
    }, shot, W, H), "base64");
    const full = Buffer.from(shot, "base64");
    const small = indexedPng(W, H, quantize(rgba, W));
    const png = small.length < full.length ? small : full;
    fs.writeFileSync(OUT[lang], png);
    if (fs.existsSync(builtImg)) fs.writeFileSync(path.join(builtImg, path.basename(OUT[lang])), png);
    console.log(`✔ ${path.relative(root, OUT[lang]).replace(/\\/g, "/")} (${Math.round(png.length / 1024)} KB${png === small ? `, 256 colours; truecolour would be ${Math.round(full.length / 1024)} KB` : ""})`);
  }
} finally {
  await browser.close();
}
