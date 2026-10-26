#!/usr/bin/env node
// Responsive + accessibility check of the BUILT site (_site/). Run after `npm run build` (or `npx eleventy`):
//
//   npm run test:ui                      every page, widths 320 390 768 1024 1440, light and dark
//   node scripts/ui-test.mjs /join/ /es/join/      only these pages
//   WIDTHS=320,1920 SCHEMES=dark node scripts/ui-test.mjs
//
// For each page × width × colour scheme it checks:
//   · no horizontal scrolling (the page is never wider than the screen)
//   · axe-core: no WCAG 2.2 A/AA violations (colour contrast, names, landmarks, target size …)
//   · exactly one <h1>, every <img> loaded, no JavaScript errors
// and, once per page, that the mobile menu opens and closes and the Add to calendar menu stays on screen.
// Exits with status 1 when anything fails, so CI can use it.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "package.json"));
const puppeteer = require("puppeteer");
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const siteDir = path.join(root, "_site");
if (!fs.existsSync(path.join(siteDir, "index.html"))) {
  console.error("_site/index.html not found — run `npm run build` (or `npx eleventy`) first.");
  process.exit(2);
}

// Every HTML page except the redirect stubs (meta refresh) and the poster's print-only views.
function allPages() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== "assets" && e.name !== "brand") walk(p); continue; }
      if (!e.name.endsWith(".html")) continue;
      const html = fs.readFileSync(p, "utf8");
      if (/http-equiv="refresh"/i.test(html)) continue;
      const rel = "/" + path.relative(siteDir, p).replace(/\\/g, "/");
      out.push(rel.endsWith("index.html") ? rel.slice(0, -"index.html".length) : rel);
    }
  };
  walk(siteDir);
  return out.sort();
}

const pages = process.argv.slice(2).length ? process.argv.slice(2) : allPages();
const widths = (process.env.WIDTHS || "320,390,768,1024,1440").split(",").map(Number);
const schemes = (process.env.SCHEMES || "light,dark").split(",");

const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".json": "application/json", ".ico": "image/x-icon", ".pdf": "application/pdf", ".ics": "text/calendar", ".webmanifest": "application/manifest+json", ".xml": "application/xml" };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  let f = path.join(siteDir, p);
  if (!f.startsWith(siteDir)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) {
    const notFound = path.join(siteDir, "404.html");
    res.writeHead(404, { "content-type": types[".html"] });
    res.end(fs.existsSync(notFound) ? fs.readFileSync(notFound) : "Not found");
    return;
  }
  res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await puppeteer.launch({ headless: true });
const failures = [];
const fail = (where, msg) => { failures.push(`${where}: ${msg}`); };
let checks = 0;

for (const url of pages) {
  for (const scheme of schemes) {
    for (const width of widths) {
      const where = `${url} @${width}px ${scheme}`;
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => { if (m.type() === "error" && !/Permissions-Policy/.test(m.text())) errors.push(m.text()); });
      await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }, { name: "prefers-reduced-motion", value: "reduce" }]);
      await page.emulateTimezone("America/Chicago");
      await page.setViewport({ width, height: 900 });
      const res = await page.goto(base + url, { waitUntil: "networkidle0" });
      if (!res || (res.status() !== 200 && !url.endsWith("404.html"))) fail(where, `HTTP ${res ? res.status() : "no response"}`);
      // Scroll through once so lazy images load, then wait for fonts and images.
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); }
        window.scrollTo(0, 0);
        await Promise.race([new Promise((r) => setTimeout(r, 4000)), Promise.all([document.fonts.ready, ...Array.from(document.images).map((i) => (i.complete ? 0 : new Promise((r) => { i.addEventListener("load", r); i.addEventListener("error", r); })))])]);
      });
      checks++;

      const facts = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const wide = [];
        if (document.documentElement.scrollWidth > vw + 1) {
          for (const el of document.querySelectorAll("body *")) {
            const r = el.getBoundingClientRect();
            if (r.width && r.right > vw + 1 && getComputedStyle(el).position !== "fixed") {
              const cls = typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".") : "";
              wide.push(`${el.tagName.toLowerCase()}${cls} (right edge ${Math.round(r.right)}px)`);
              if (wide.length >= 4) break;
            }
          }
        }
        return {
          scrollWidth: document.documentElement.scrollWidth, vw, wide,
          h1: document.querySelectorAll("h1").length,
          brokenImages: Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
        };
      });
      if (facts.scrollWidth > facts.vw + 1) fail(where, `horizontal overflow: page is ${facts.scrollWidth}px wide — ${facts.wide.join(", ")}`);
      if (facts.h1 !== 1 && !url.includes("poster")) fail(where, `${facts.h1} <h1> elements (want exactly 1)`);
      for (const src of facts.brokenImages) fail(where, `image failed to load: ${src}`);
      for (const e of errors) fail(where, `JS error: ${e}`);

      // axe-core runs once per page per scheme (contrast depends on the scheme, not much on the width),
      // at the narrowest and widest widths (target size and hidden content can differ there).
      if (width === widths[0] || width === widths[widths.length - 1]) {
        await page.addScriptTag({ content: axeSource });
        const axe = await page.evaluate(async () => {
          const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] }, rules: { "region": { enabled: false } } });
          return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ") + (n.failureSummary ? " — " + n.failureSummary.split("\n").slice(1, 2).join(" ").trim() : "")) }));
        });
        for (const v of axe) fail(where, `axe ${v.impact} ${v.id}: ${v.help} → ${v.nodes.join(" | ")}`);
      }

      // Interaction checks, once per page (light, narrowest and widest).
      if (scheme === schemes[0] && width === widths[0]) {
        const toggle = await page.$("[data-menu-toggle]");
        if (toggle && (await toggle.isVisible())) {
          await toggle.click();
          const open = await page.$eval("#site-menu", (m) => !m.hidden && m.getBoundingClientRect().height > 0);
          if (!open) fail(where, "mobile menu did not open");
          await page.keyboard.press("Escape");
          const closed = await page.$eval("#site-menu", (m) => m.hidden);
          if (!closed) fail(where, "mobile menu did not close on Escape");
        }
      }
      if (scheme === schemes[0] && (width === widths[0] || width === widths[widths.length - 1])) {
        const cal = await page.$("details.cal-menu > summary");
        if (cal && (await cal.isVisible())) {
          await cal.click();
          await new Promise((r) => setTimeout(r, 100));
          const r = await page.$eval("details.cal-menu .cal-menu-panel", (p) => { const b = p.getBoundingClientRect(); return { left: b.left, right: b.right, vw: document.documentElement.clientWidth }; });
          if (r.left < 0 || r.right > r.vw) fail(where, `Add to calendar menu off screen (left ${Math.round(r.left)}, right ${Math.round(r.right)}, viewport ${r.vw})`);
          await page.keyboard.press("Escape");
        }
      }
      await page.close();
    }
  }
  process.stdout.write(".");
}
await browser.close();
server.close();

console.log(`\n${pages.length} pages × ${widths.length} widths × ${schemes.length} colour schemes = ${checks} views checked.`);
if (failures.length) {
  const unique = [...new Set(failures)];
  console.log(`\n✘ ${unique.length} problem(s):\n  - ${unique.join("\n  - ")}`);
  process.exit(1);
}
console.log("✔ No overflow, no accessibility violations, no broken images, no JS errors.");
