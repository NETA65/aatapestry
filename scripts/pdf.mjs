#!/usr/bin/env node
// Render the printable poster of the BUILT site to print-ready PDF (Letter + A4) and 300-dpi PNG with
// headless Chrome (Puppeteer), into brand/poster/. The poster is #poster on the flyer & poster pages
// (_site/flyer/ and _site/es/flyer/, src/pages/flyer.njk), which print as the poster alone. Run after
// `npm run build`; CI runs it on every deploy. If Chrome cannot start (rare), the site still deploys with
// the previously committed files.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteDir = path.join(root, "_site");
const outDir = path.join(root, "brand", "poster");
fs.mkdirSync(outDir, { recursive: true });
for (const rel of [["flyer", "index.html"], ["es", "flyer", "index.html"]]) {
  if (!fs.existsSync(path.join(siteDir, ...rel))) {
    console.error(`_site/${rel.join("/")} not found — run \`npm run build\` first.`);
    process.exit(1);
  }
}

// A tiny static server for _site (absolute /assets/… URLs need an origin, not file://).
const TYPES = { html: "text/html; charset=utf-8", css: "text/css", js: "text/javascript", mjs: "text/javascript", svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", avif: "image/avif", gif: "image/gif", ico: "image/x-icon", woff2: "font/woff2", woff: "font/woff", json: "application/json", webmanifest: "application/manifest+json", xml: "application/xml", ics: "text/calendar", txt: "text/plain", pdf: "application/pdf", md: "text/markdown" };
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
    const url = `http://127.0.0.1:${port}${lang === "es" ? "/es" : ""}/flyer/`;
    const page = await browser.newPage();
    await page.emulateMediaType("print");
    await page.setViewport({ width: 900, height: 1300, deviceScaleFactor: 1 });
    const res = await page.goto(url, { waitUntil: "networkidle0" });
    if (!res || !res.ok()) throw new Error(`${url} answered ${res ? res.status() : "nothing"} — is _site built?`);
    // The poster element is the contract with src/pages/flyer.njk; stop before writing anything without it.
    if (!(await page.$("#poster"))) throw new Error(`#poster not found on ${url} — keep id="poster" in src/pages/flyer.njk.`);
    await page.evaluate(() => document.fonts.ready);

    const letter = path.join(outDir, `aatapestry-poster${suffix}-letter.pdf`);
    await page.pdf({ path: letter, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    files.push(letter);

    // A4: the layout's @page says "letter", and with preferCSSPageSize:false Chrome lays the page out at
    // letter size and shrinks it onto A4, so the 297 mm poster spilled onto a second page. Declare an A4
    // @page for this render instead (a later @page rule wins), and let Chrome use it.
    await page.evaluate(() => {
      document.documentElement.dataset.size = "a4";
      const s = document.createElement("style");
      s.id = "pdf-a4-page"; s.media = "print"; s.textContent = "@page { size: A4; margin: 0; }";
      document.head.appendChild(s);
    });
    const a4 = path.join(outDir, `aatapestry-poster${suffix}-a4.pdf`);
    await page.pdf({ path: a4, format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    files.push(a4);

    // 300-dpi PNG of the Letter poster (8.5 in × 300 = 2550 px wide).
    await page.evaluate(() => { delete document.documentElement.dataset.size; document.getElementById("pdf-a4-page")?.remove(); });
    await page.emulateMediaType("screen");
    await page.setViewport({ width: 900, height: 1300, deviceScaleFactor: 2550 / 816 });
    // On the flyer & poster page the sheet sits far down, at a fractional y (2502.78 px in English); at this
    // scale the element clip then cuts the sheet's top rows and picks up the stage's background and the
    // sheet's shadow below it. Lay the page out as on paper (the sheet alone at y = 0, as the print rules
    // in poster.css do) for the capture.
    await page.addStyleTag({ content: "body > :not(main), main > :not(.poster-stage), .poster-stage-head, .poster-panel, .poster-preview-label { display: none !important; } main, .poster-stage, .poster-layout, .poster-preview { display: block !important; margin: 0 !important; padding: 0 !important; }" });
    await page.evaluate(() => document.fonts.ready);
    const el = await page.$("#poster");
    if (!el) throw new Error(`#poster not found on ${url} (screen media).`);
    const box = await el.boundingBox();
    if (!box || box.y !== 0 || box.width !== 816) throw new Error(`#poster on ${url} is at y=${box && box.y}, ${box && box.width} px wide; the PNG needs it at y=0, 816 px wide.`);
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
