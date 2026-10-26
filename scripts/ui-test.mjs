#!/usr/bin/env node
// Responsive + accessibility check of the BUILT site (_site/). Run after `npm run build` (or `npx eleventy`):
//
//   npm run test:ui                      every page, widths 320 390 540 768 1024 1440, light and dark
//   node scripts/ui-test.mjs /join/ /es/join/      only these pages
//   WIDTHS=320,1920 SCHEMES=dark node scripts/ui-test.mjs
//
// For each page × width × colour scheme it checks:
//   · no horizontal scrolling (the page is never wider than the screen)
//   · the header: the site name never runs under the menu or the buttons, the Join button stays on one
//     line and the bar keeps its height (540 is in the default widths: Join and "Menu" appear at 480)
//   · axe-core: no WCAG 2.2 A/AA violations (colour contrast, names, landmarks, target size …)
//   · exactly one <h1>, every <img> loaded, no JavaScript errors
// and, once per page, that the mobile menu opens, closes on Escape and when Tab leaves it; and, in each
// colour scheme, that the Add to calendar menu stays on screen, its items and their focus ring are
// readable on the panel (computed contrast: axe cannot tell over the hero's texture), and Tab out closes it.
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
const widths = (process.env.WIDTHS || "320,390,540,768,1024,1440").split(",").map(Number);
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

      // The header: nothing overflows the page there, so check the boxes themselves.
      const hdr = await page.evaluate(() => {
        const visible = (el) => !!el && getComputedStyle(el).display !== "none" && el.getBoundingClientRect().width > 0;
        const name = document.querySelector(".site-header .brand-name");
        if (!name) return null;
        const range = document.createRange();
        range.selectNodeContents(name);
        const nameRight = Math.max(name.getBoundingClientRect().right, range.getBoundingClientRect().right);
        const navDesktop = document.querySelector(".site-header .nav-desktop");
        const next = visible(navDesktop) ? navDesktop.querySelector(".nav-link") : Array.from(document.querySelectorAll(".site-header .nav-actions > *")).find(visible);
        const cta = document.querySelector(".site-header .header-cta");
        const bar = document.querySelector(".site-header-bar");
        return {
          nameRight: Math.round(nameRight),
          nextLeft: next ? Math.round(next.getBoundingClientRect().left) : null,
          next: next ? (next.className.baseVal ?? next.className).split(" ")[0] : "",
          ctaHeight: visible(cta) ? Math.round(cta.getBoundingClientRect().height) : 0,
          barHeight: bar ? Math.round(bar.getBoundingClientRect().height) : 0,
        };
      });
      if (hdr) {
        if (hdr.nextLeft !== null && hdr.nameRight > hdr.nextLeft) fail(where, `header: the site name (right edge ${hdr.nameRight}px) runs under .${hdr.next} (left edge ${hdr.nextLeft}px)`);
        if (hdr.ctaHeight > 44) fail(where, `header: the Join button wraps (${hdr.ctaHeight}px tall)`);
        if (hdr.barHeight > 65) fail(where, `header: the bar grew to ${hdr.barHeight}px (want 64)`);
      }
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

      // Interaction checks, once per page (light, narrowest width).
      if (scheme === schemes[0] && width === widths[0]) {
        const toggle = await page.$("[data-menu-toggle]");
        if (toggle && (await toggle.isVisible())) {
          await toggle.click();
          const open = await page.$eval("#site-menu", (m) => !m.hidden && m.getBoundingClientRect().height > 0);
          if (!open) fail(where, "mobile menu did not open");
          await page.keyboard.press("Escape");
          const closed = await page.$eval("#site-menu", (m) => m.hidden);
          if (!closed) fail(where, "mobile menu did not close on Escape");
          // Tab past the last item: the menu closes, so it never covers the next focused control (WCAG 2.4.11).
          await toggle.click();
          await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll("#site-menu a, #site-menu button")).filter((el) => el.getBoundingClientRect().width > 0);
            items[items.length - 1].focus();
          });
          await page.keyboard.press("Tab");
          const tabbedOut = await page.$eval("#site-menu", (m) => m.hidden || !m.contains(document.activeElement));
          const closedOnTab = await page.$eval("#site-menu", (m) => m.hidden);
          if (tabbedOut && !closedOnTab) fail(where, "mobile menu stays open after Tab leaves it");
          if (!closedOnTab) await page.keyboard.press("Escape");
        }
      }
      // Add to calendar, at the narrowest and widest widths: on screen (light only), then in each scheme the
      // items' text and focus ring against the panel (the hero's .on-dark gold must not reach them), and Tab out.
      if (width === widths[0] || width === widths[widths.length - 1]) {
        const cal = await page.$("details.cal-menu > summary");
        if (cal && (await cal.isVisible())) {
          await cal.click();
          await new Promise((r) => setTimeout(r, 100));
          if (scheme === schemes[0]) {
            const r = await page.$eval("details.cal-menu .cal-menu-panel", (p) => { const b = p.getBoundingClientRect(); return { left: b.left, right: b.right, vw: document.documentElement.clientWidth }; });
            if (r.left < 0 || r.right > r.vw) fail(where, `Add to calendar menu off screen (left ${Math.round(r.left)}, right ${Math.round(r.right)}, viewport ${r.vw})`);
            // Every item must be tappable: nothing (a clipping ancestor, the next section) may cover it.
            const blocked = await page.evaluate(() => {
              document.documentElement.style.scrollBehavior = "auto"; // smooth scrolling would fake "blocked" results
              const out = [];
              for (const a of document.querySelectorAll("details.cal-menu[open] .cal-menu-panel a")) {
                a.scrollIntoView({ block: "center" });
                const b = a.getBoundingClientRect();
                const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
                if (!hit || !a.contains(hit)) out.push(a.textContent.trim());
              }
              document.documentElement.style.scrollBehavior = "";
              return out;
            });
            for (const label of blocked) fail(where, `Add to calendar item "${label}" is covered or clipped and cannot be tapped`);
          }
          await page.keyboard.press("Tab"); // keyboard focus on the first item, so :focus-visible applies
          const low = await page.evaluate(() => {
            const rgb = (s) => { const m = String(s).match(/[\d.]+/g) || [0, 0, 0, 1]; return { r: +m[0], g: +m[1], b: +m[2], a: m[3] === undefined ? 1 : +m[3] }; };
            const over = (c, bg) => ({ r: c.r * c.a + bg.r * (1 - c.a), g: c.g * c.a + bg.g * (1 - c.a), b: c.b * c.a + bg.b * (1 - c.a) });
            const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
            const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
            const panel = document.querySelector("details.cal-menu[open] .cal-menu-panel");
            if (!panel) return ["panel did not open"];
            const bg = rgb(getComputedStyle(panel).backgroundColor);
            const out = [];
            for (const a of panel.querySelectorAll("a")) {
              const cs = getComputedStyle(a);
              const t = ratio(over(rgb(cs.color), bg), bg);
              if (t < 4.5) out.push(`"${a.textContent.trim()}" text ${t.toFixed(2)}:1`);
              if (a === document.activeElement) {
                if (!a.matches(":focus-visible")) out.push(`"${a.textContent.trim()}" has focus but no :focus-visible`);
                else { const f = ratio(over(rgb(cs.outlineColor), bg), bg); if (f < 3) out.push(`"${a.textContent.trim()}" focus ring ${f.toFixed(2)}:1`); }
              }
            }
            return out;
          });
          for (const m of low) fail(where, `Add to calendar menu: ${m} on the panel`);
          // Tab past the last item closes the panel (WCAG 2.4.11).
          await page.evaluate(() => { const links = document.querySelectorAll("details.cal-menu[open] .cal-menu-panel a"); if (links.length) links[links.length - 1].focus(); });
          await page.keyboard.press("Tab");
          const stillOpen = await page.evaluate(() => { const d = document.querySelector("details.cal-menu"); return d.open && !d.contains(document.activeElement); });
          if (stillOpen) fail(where, "Add to calendar menu stays open after Tab leaves it");
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
