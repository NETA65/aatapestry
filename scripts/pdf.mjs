#!/usr/bin/env node
// Render the poster pages of the BUILT site (_site/poster/ and _site/es/poster/) to
// print-ready PDF (Letter + A4) and 300-dpi PNG with headless Chrome (Puppeteer), into
// brand/poster/. Run after `npm run build`; CI runs it on every deploy. If Chrome cannot
// start (rare), the site still deploys with the previously committed files.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteDir = path.join(root, "_site");
const outDir = path.join(root, "brand", "poster");
fs.mkdirSync(outDir, { recursive: true });
if (!fs.existsSync(path.join(siteDir, "poster", "index.html"))) {
  console.error("_site/poster/index.html not found — run `npm run build` first.");
  process.exit(1);
}

// A tiny static server for _site (absolute /assets/… URLs need an origin, not file://).
const TYPES = { html: "text/html; charset=utf-8", css: "text/css", js: "text/javascript", mjs: "text/javascript", svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", ico: "image/x-icon", woff2: "font/woff2", woff: "font/woff", json: "application/json", webmanifest: "application/manifest+json", xml: "application/xml", ics: "text/calendar", txt: "text/plain", pdf: "application/pdf", md: "text/markdown" };
const server = http.createServer((req, res) => {
  try {
    const p = decodeURIComponent(new URL(req.url, "http://localhost").pathname).replace(/\\/g, "/");
    let file = path.resolve(siteDir, "." + p);
    if (file !== siteDir && !file.startsWith(siteDir + path.sep)) { res.writeHead(403); res.end("forbidden"); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "content-type": TYPES[path.extname(file).slice(1)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  } catch (e) { res.writeHead(500); res.end(String(e)); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none", "--disable-gpu"] });
const files = [];
try {
  for (const lang of ["en", "es"]) {
    const suffix = lang === "es" ? "-es" : "";
    const url = `http://127.0.0.1:${port}${lang === "es" ? "/es" : ""}/poster/`;
    const page = await browser.newPage();
    await page.emulateMediaType("print");
    await page.setViewport({ width: 900, height: 1300, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.evaluate(() => document.fonts.ready);

    const letter = path.join(outDir, `aatapestry-poster${suffix}-letter.pdf`);
    await page.pdf({ path: letter, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    files.push(letter);

    await page.evaluate(() => { document.documentElement.dataset.size = "a4"; });
    const a4 = path.join(outDir, `aatapestry-poster${suffix}-a4.pdf`);
    await page.pdf({ path: a4, format: "A4", printBackground: true, preferCSSPageSize: false, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    files.push(a4);

    // 300-dpi PNG of the Letter poster (8.5 in × 300 = 2550 px wide).
    await page.evaluate(() => { delete document.documentElement.dataset.size; });
    await page.emulateMediaType("screen");
    await page.setViewport({ width: 900, height: 1300, deviceScaleFactor: 2550 / 816 });
    await page.evaluate(() => document.fonts.ready);
    const el = await page.$("#poster");
    const pngFile = path.join(outDir, `aatapestry-poster${suffix}.png`);
    await el.screenshot({ path: pngFile, type: "png", omitBackground: false });
    files.push(pngFile);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
// The built site should carry the fresh files too (the build copied the old ones earlier).
for (const f of files) {
  const dest = path.join(siteDir, "brand", "poster", path.basename(f));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(f, dest);
}
console.log(`✔ poster: ${files.map((f) => path.relative(root, f).replace(/\\/g, "/")).join(", ")}`);
