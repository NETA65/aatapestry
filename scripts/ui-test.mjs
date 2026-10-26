#!/usr/bin/env node
// Responsive + accessibility check of the BUILT site (_site/). Run after `npm run build` (or `npx eleventy`):
//
//   npm run test:ui                      every page (not the redirect stubs), widths 320 390 540 768 1024 1440, light, dark and lightbg
//   node scripts/ui-test.mjs /join/ /es/join/      only these pages
//   WIDTHS=320,1920 SCHEMES=dark node scripts/ui-test.mjs
//
// The colour schemes: "light" and "dark" are the device's setting; "lightbg" is a device in dark mode with
// the visitor's Lighter background option on (localStorage "aat-theme", theme-light.css), so the light
// flyer surfaces are checked too. Every view starts with the option as its scheme says (storage is shared
// by the pages of one browser).
// For each page × width × colour scheme it checks:
//   · no horizontal scrolling (the page is never wider than the screen)
//   · the header: the site name never runs under the menu or the buttons, the Join button stays on one
//     line and the bar keeps its height (540 is in the default widths: Join and "Menu" appear at 480)
//   · axe-core: no WCAG 2.2 A/AA violations (colour contrast, names, landmarks, target size …)
//   · exactly one <h1>, every <img> loaded, no JavaScript errors
// and, once per page, that the mobile menu opens, closes on Escape and when Tab leaves it; and, in each
// colour scheme, that the Add to calendar menu stays on screen, its items and their focus ring are
// readable on the panel (computed contrast: axe cannot tell over the hero's texture), and Tab out closes it.
// Then, per page: the Add to calendar items open fully on screen on real phone and laptop screens
// (390×844, 1366×768, 360×640), with the button where it is on load and near the bottom edge; without
// JavaScript the header still has a Menu link to the footer's page list (and no Lighter background
// button); the Lighter background button is reached with Tab, Enter and Space toggle <html data-theme>
// and aria-pressed, and the choice survives a reload, applied before the body is parsed (no flash of
// the navy look); and with big text (a browser
// minimum font size of 24 px, or a root font of 24 px) at 1024 and 1280 the header stays one bar (the
// site name never breaks inside a word, nothing scrolls sideways). Once: /feed.xml is well-formed Atom
// and keeps the ids its subscribers already have.
// Exits with status 1 when anything fails, so CI can use it.
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
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

// A redirect stub (src/pages/redirects.njk: /schedule/, /poster/ …) only forwards with a meta refresh.
const isStub = (file) => /http-equiv="refresh"/i.test(fs.readFileSync(file, "utf8"));

// Every HTML page except the redirect stubs.
function allPages() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== "assets" && e.name !== "brand") walk(p); continue; }
      if (!e.name.endsWith(".html")) continue;
      if (isStub(p)) continue;
      const rel = "/" + path.relative(siteDir, p).replace(/\\/g, "/");
      out.push(rel.endsWith("index.html") ? rel.slice(0, -"index.html".length) : rel);
    }
  };
  walk(siteDir);
  return out.sort();
}

// Pages named on the command line skip the stubs too (they would navigate away mid-check); say so.
const pages = process.argv.slice(2).length
  ? process.argv.slice(2).filter((u) => {
      const f = path.join(siteDir, u.split("#")[0], u.endsWith("/") ? "index.html" : "");
      if (fs.existsSync(f) && fs.statSync(f).isFile() && isStub(f)) { console.log(`(skipped ${u}: a redirect stub)`); return false; }
      return true;
    })
  : allPages();
const widths = (process.env.WIDTHS || "320,390,540,768,1024,1440").split(",").map(Number);
const schemes = (process.env.SCHEMES || "light,dark,lightbg").split(",");
// The Lighter background option: the key app.js saves and the inline script in partials/head.njk reads.
const THEME_KEY = "aat-theme";
// Before any of the page's own scripts: the option on (lightbg) or off (every other view).
const setLightBg = (page, on) => page.evaluateOnNewDocument((key, on) => {
  try { if (on) localStorage.setItem(key, "light"); else localStorage.removeItem(key); } catch { /* about:blank */ }
}, THEME_KEY, on);

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

// In the page: the open Add to calendar items that are not fully on screen (above the screen, under the
// sticky header, or below the bottom edge). Measured as they open, with no scrolling, like a visitor's tap.
function calItemsOffScreen() {
  const header = document.querySelector(".site-header");
  const top = Math.max(0, header ? header.getBoundingClientRect().bottom : 0);
  const vw = document.documentElement.clientWidth;
  return Array.from(document.querySelectorAll("details.cal-menu[open] .cal-menu-panel a"))
    .filter((a) => { const b = a.getBoundingClientRect(); return b.top < top - 0.5 || b.bottom > window.innerHeight + 0.5 || b.left < -0.5 || b.right > vw + 0.5; })
    .map((a) => `"${(a.querySelector("span") || a).textContent.trim()}"`);
}

// The same flags as scripts/pdf.mjs: GitHub's Ubuntu runners block Chrome's sandbox, and the pages are our own build.
const launchArgs = ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none", "--disable-gpu"];
const browser = await puppeteer.launch({ headless: true, args: launchArgs });
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
      await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme === "lightbg" ? "dark" : scheme }, { name: "prefers-reduced-motion", value: "reduce" }]);
      await setLightBg(page, scheme === "lightbg");
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
      if (facts.h1 !== 1) fail(where, `${facts.h1} <h1> elements (want exactly 1)`);
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
            const off = await page.evaluate(calItemsOffScreen);
            if (off.length) fail(where, `Add to calendar items open off screen: ${off.join(", ")}`);
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

// Opens a page for the extra checks below (light scheme, the Lighter background off, reduced motion, the
// fonts and images in). b: a browser or a browser context.
async function openPage(b, url, width, height, { js = true } = {}) {
  const page = await b.newPage();
  await page.setJavaScriptEnabled(js);
  if (js) await setLightBg(page, false);
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }, { name: "prefers-reduced-motion", value: "reduce" }]);
  await page.emulateTimezone("America/Chicago");
  await page.setViewport({ width, height });
  await page.goto(base + url, { waitUntil: "networkidle0" });
  await page.evaluate(() => Promise.race([new Promise((r) => setTimeout(r, 3000)), document.fonts.ready]));
  return page;
}
// Lets a change of size settle: app.js re-checks the header a frame or two after it changes size.
const settle = (page) => page.evaluate(() => new Promise((r) => {
  const twoFrames = (next) => requestAnimationFrame(() => requestAnimationFrame(next));
  twoFrames(() => setTimeout(() => twoFrames(r), 150));
}));

for (const url of pages) {
  const where = (w, h, extra = "") => `${url} @${w}×${h}${extra}`;

  // Add to calendar on real screen sizes: tapped where the button is on load (when it is on screen),
  // and with the button near the bottom edge (how a visitor scrolls to it). Every item must open fully
  // on screen; the 900 px tall views above can hide a panel that opens off the bottom.
  for (const [w, h] of [[390, 844], [1366, 768], [360, 640]]) {
    const page = await openPage(browser, url, w, h);
    if (await page.$("details.cal-menu > summary")) {
      for (const at of ["load", "bottom"]) {
        const ok = await page.evaluate((at) => {
          document.documentElement.style.scrollBehavior = "auto";
          const s = document.querySelector("details.cal-menu > summary");
          if (!s || !s.getClientRects().length) return false;
          if (at === "bottom") window.scrollBy(0, s.getBoundingClientRect().bottom - (window.innerHeight - 8));
          document.documentElement.style.scrollBehavior = "";
          const b = s.getBoundingClientRect();
          const header = document.querySelector(".site-header");
          return b.top >= Math.max(0, header ? header.getBoundingClientRect().bottom : 0) && b.bottom <= window.innerHeight;
        }, at);
        if (!ok) continue; // not on screen at load (the button is further down the page)
        await page.click("details.cal-menu > summary");
        await new Promise((r) => setTimeout(r, 150));
        const off = await page.evaluate(calItemsOffScreen);
        if (off.length) fail(where(w, h, `, button ${at === "load" ? "where it is on load" : "near the bottom edge"}`), `Add to calendar items open off screen: ${off.join(", ")}`);
        await page.keyboard.press("Escape");
      }
    }
    await page.close();
  }

  // Without JavaScript the header's Menu control is a link to the footer's list of pages.
  {
    const page = await openPage(browser, url, 390, 844, { js: false });
    const r = await page.evaluate(() => {
      const a = document.querySelector(".site-header [data-menu-fallback]");
      const btn = document.querySelector(".site-header [data-menu-toggle]");
      const target = a && document.getElementById((a.getAttribute("href") || "").slice(1));
      const theme = document.querySelector("[data-theme-toggle]");
      return { link: !!a && a.getBoundingClientRect().width > 0, target: !!target && target.tagName === "NAV", button: !!btn && btn.getBoundingClientRect().width > 0, theme: !!theme && theme.getBoundingClientRect().width > 0 };
    });
    if (!r.link) fail(where(390, 844, ", no JavaScript"), "the header has no visible Menu link");
    else if (!r.target) fail(where(390, 844, ", no JavaScript"), "the header's Menu link does not lead to the footer's page list");
    if (r.button) fail(where(390, 844, ", no JavaScript"), "the header shows the Menu button, which needs JavaScript");
    if (r.theme) fail(where(390, 844, ", no JavaScript"), "the header shows the Lighter background button, which needs JavaScript");
    await page.close();
  }

  // The Lighter background button, from the keyboard (Tab to it from the site name, Enter, Space) and the
  // mouse, at the narrowest width; then a reload keeps the choice. In a context of its own, so what it
  // stores reaches no other check. The option must be on before the <body> is parsed (the inline script
  // in head.njk), not only once app.js runs, or the navy look would flash first.
  {
    const here = where(320, 700, ", Lighter background");
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }, { name: "prefers-reduced-motion", value: "reduce" }]);
    await page.setViewport({ width: 320, height: 700 });
    await page.evaluateOnNewDocument(() => {
      new MutationObserver((recs, obs) => {
        if (!document.body) return;
        window.__themeAtBody = document.documentElement.dataset.theme || "";
        obs.disconnect();
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto(base + url, { waitUntil: "networkidle0" });
    const state = () => page.evaluate((key) => {
      const b = document.querySelector("[data-theme-toggle]");
      let stored = null;
      try { stored = localStorage.getItem(key); } catch { stored = "(blocked)"; }
      return {
        theme: document.documentElement.dataset.theme || "", pressed: b ? b.getAttribute("aria-pressed") : null,
        focused: !!b && document.activeElement === b, stored, atBody: window.__themeAtBody,
        meta: (document.querySelector('meta[name="theme-color"]') || {}).content || "",
      };
    }, THEME_KEY);
    const visible = await page.$eval("[data-theme-toggle]", (b) => b.getBoundingClientRect().width >= 44 && b.getBoundingClientRect().height >= 44).catch(() => false);
    if (!visible) fail(here, "no Lighter background button of at least 44×44 px in the header");
    else {
      let s = await state();
      if (s.theme || s.pressed !== "false") fail(here, `starts on (data-theme "${s.theme}", aria-pressed ${s.pressed}); want off`);
      await page.focus(".site-header .brand");
      await page.keyboard.press("Tab");
      s = await state();
      if (!s.focused) fail(here, "Tab from the site name does not reach the button");
      await page.focus("[data-theme-toggle]");
      await page.keyboard.press("Enter");
      s = await state();
      if (s.theme !== "light" || s.pressed !== "true" || s.stored !== "light") fail(here, `Enter: data-theme "${s.theme}", aria-pressed ${s.pressed}, stored ${s.stored}; want light, true, light`);
      if (s.meta.toLowerCase() !== "#fffdf8") fail(here, `Enter: theme-color is ${s.meta}, want the header's paper #fffdf8`);
      await page.keyboard.press("Space");
      s = await state();
      if (s.theme || s.pressed !== "false" || s.stored !== null) fail(here, `Space: data-theme "${s.theme}", aria-pressed ${s.pressed}, stored ${s.stored}; want off, false, nothing stored`);
      await page.click("[data-theme-toggle]");
      await page.reload({ waitUntil: "networkidle0" });
      s = await state();
      if (s.theme !== "light" || s.pressed !== "true") fail(here, `after a reload: data-theme "${s.theme}", aria-pressed ${s.pressed}; want light, true`);
      if (s.atBody !== "light") fail(here, "after a reload the option is applied only after the body is parsed (a flash of the navy look)");
    }
    await ctx.close();
  }
  process.stdout.write(":");
}

// Big text in a wide window: the 64rem breakpoint does not follow a browser minimum font size or a user
// stylesheet, so app.js must switch the header to Join + Menu when the full menu does not fit.
// Chrome's minimum font size comes from a profile's preferences; the root font is injected.
const minFontProfile = fs.mkdtempSync(path.join(os.tmpdir(), "ui-test-minfont-"));
fs.mkdirSync(path.join(minFontProfile, "Default"), { recursive: true });
fs.writeFileSync(path.join(minFontProfile, "Default", "Preferences"), JSON.stringify({ webkit: { webprefs: { minimum_font_size: 24 } } }));
const bigBrowser = await puppeteer.launch({ headless: true, args: launchArgs, userDataDir: minFontProfile });
const headerFacts = () => {
  const header = document.querySelector(".site-header");
  const name = document.querySelector(".site-header .brand-name");
  const probe = document.createElement("span");
  probe.textContent = "Incredible";
  probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap";
  name.appendChild(probe);
  const word = probe.getBoundingClientRect().width;
  probe.remove();
  // One bar: its 4rem height (64 px, or 96 px with a 24 px root font) plus the 1 px bottom border.
  const bar = parseFloat(getComputedStyle(document.querySelector(".site-header-bar")).minHeight) || 64;
  const vw = document.documentElement.clientWidth;
  const wide = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width && r.right > vw + 1 && wide.length < 4) wide.push(`${el.tagName.toLowerCase()}.${String(el.className.baseVal ?? el.className).trim().split(/\s+/).slice(0, 2).join(".")} (right edge ${Math.round(r.right)}px)`);
  }
  return { height: Math.round(header.getBoundingClientRect().height), max: Math.round(bar) + 2, name: Math.round(name.getBoundingClientRect().width), word: Math.round(word), overflow: document.documentElement.scrollWidth - vw, wide };
};
for (const url of pages) {
  for (const mode of ["minimum font size 24px", "root font 24px"]) {
    const page = await openPage(mode.startsWith("minimum") ? bigBrowser : browser, url, 1024, 800);
    if (mode.startsWith("root")) { await page.addStyleTag({ content: "html { font-size: 24px !important; }" }); await page.evaluate(() => window.dispatchEvent(new Event("resize"))); }
    for (const w of [1024, 1280]) {
      if (w !== 1024) await page.setViewport({ width: w, height: 800 });
      await settle(page);
      const f = await page.evaluate(headerFacts);
      const here = `${url} @${w}px, ${mode}`;
      if (f.height > f.max) fail(here, `header: ${f.height}px tall (want one bar, at most ${f.max})`);
      if (f.name + 1 < f.word) fail(here, `header: the site name is ${f.name}px wide, narrower than the word "Incredible" (${f.word}px)`);
      if (f.overflow > 1) fail(here, `horizontal overflow: the page is ${f.overflow}px wider than the screen — ${f.wide.join(", ")}`);
    }
    await page.close();
  }
}
await bigBrowser.close();
try { fs.rmSync(minFontProfile, { recursive: true, force: true }); } catch { /* a locked temp profile is harmless */ }

// The updates feed: well-formed Atom, and the entries subscribers already have keep their ids.
{
  const feedFile = path.join(siteDir, "feed.xml");
  if (!fs.existsSync(feedFile)) fail("/feed.xml", "missing (subscribers to the feed would get the 404 page)");
  else {
    const page = await browser.newPage();
    const r = await page.evaluate((xml) => {
      const d = new DOMParser().parseFromString(xml, "application/xml");
      if (d.querySelector("parsererror")) return { error: d.querySelector("parsererror").textContent.slice(0, 200) };
      return { root: d.documentElement.localName, ids: Array.from(d.getElementsByTagName("entry")).map((e) => (e.getElementsByTagName("id")[0] || {}).textContent) };
    }, fs.readFileSync(feedFile, "utf8"));
    if (r.error) fail("/feed.xml", `not well-formed XML: ${r.error}`);
    else {
      if (r.root !== "feed") fail("/feed.xml", `root element is <${r.root}>, not an Atom <feed>`);
      for (const id of ["tag:aatapestry.org,2026-10-25:the-official-flyer-is-out-and-the-zoom-details-are-set", "tag:aatapestry.org,2026-10-04:save-the-date-saturday-december-12-2026"]) {
        if (!r.ids.includes(id)) fail("/feed.xml", `the published entry ${id} is gone (or its id changed)`);
      }
    }
    await page.close();
  }
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
