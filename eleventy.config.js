// Eleventy configuration — The Incredible Tapestry (aatapestry.org)
//
// Everything on the site is generated from the data files in src/_data/
// (site.json is the single source of truth). Templates live in src/pages
// and src/_includes. Tailwind CSS is compiled here, before each build, so
// `npx eleventy --serve` is the only command needed for local work.
import { EleventyHtmlBasePlugin } from "@11ty/eleventy";
import markdownIt from "markdown-it";
import { DateTime } from "luxon";
import { minify } from "html-minifier-terser";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import when from "./src/_data/when.js";
import { applyTokens, deepTokens, plain, TOKEN_NAMES } from "./scripts/lib/tokens.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(__dirname, p), "utf8");
const site = JSON.parse(read("src/_data/site.json"));
// site.json as of the current build (re-read before every build, so --serve picks up edits for the tokens).
let liveSite = site;
const freshSite = () => liveSite;
const isProd = process.env.ELEVENTY_RUN_MODE === "build" || !!process.env.CI;

// ---------- Markdown (committee-written prose in the data files) ----------
const md = markdownIt({ html: false, linkify: true, typographer: true });
const defaultLinkOpen = md.renderer.rules.link_open || ((t, i, o, e, s) => s.renderToken(t, i, o));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const href = tokens[idx].attrGet("href") || "";
  if (/^https?:\/\//i.test(href) && !href.startsWith(site.url)) {
    tokens[idx].attrSet("target", "_blank");
    tokens[idx].attrSet("rel", "noopener");
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};
// Zoom values are data, not Markdown. The tokens are filled in before Markdown runs, so a passcode such
// as "x--y", "Ab*12*x" or "pa@ss.io" (Zoom allows @ * _ -) would come out as an en dash, emphasis or a
// mailto link. Backslash-escape the ASCII punctuation in those values first: markdown-it then keeps each
// character literally (escapes are skipped by emphasis, the typographer and linkify).
const MD_PUNCT = /[!-/:-@[-`{-~]/g;
const mdLiteral = (s) => {
  const z = ((liveSite || site).event || {}).zoom || {};
  let out = String(s ?? "");
  for (const v of [z.passcode, z.meetingId]) {
    const val = String(v ?? "");
    if (!val || !val.match(MD_PUNCT)) continue;
    out = out.split(val).join(val.replace(MD_PUNCT, "\\$&"));
  }
  return out;
};

// Prose data files: every string in them may carry {tokens} (scripts/lib/tokens.mjs). Every file in
// src/_data/pagecopy/ (one per page, each with an "en" and an "es" half) is prose too.
const PROSE_DATA = new Set(["copy.json", "i18n.json", "faq.json", "schedule.json"]);
const isProse = (filePath) => {
  const p = String(filePath || "").replace(/\\/g, "/");
  if (!p.includes("/_data/")) return false;
  return PROSE_DATA.has(path.basename(p)) || /\/_data\/pagecopy\/[^/]+\.json$/.test(p);
};
// Every bilingual dictionary: i18n.json and each src/_data/pagecopy/*.json.
const bilingualFiles = () => {
  const dir = path.join(__dirname, "src/_data/pagecopy");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => `src/_data/pagecopy/${f}`) : [];
  return ["src/_data/i18n.json", ...files];
};

// dict.en and dict.es must have the same keys (arrays and strings are leaves). Returns the differences.
function i18nKeyDiff(dict) {
  const missing = [];
  const walk = (a, b, p, label) => {
    for (const k of Object.keys(a || {})) {
      const q = p ? `${p}.${k}` : k;
      if (!b || !(k in b)) { missing.push(`${label} is missing ${q}`); continue; }
      const av = a[k], bv = b[k];
      const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
      if (isObj(av) !== isObj(bv) || Array.isArray(av) !== Array.isArray(bv)) missing.push(`${q} has a different type in en and es`);
      else if (isObj(av)) walk(av, bv, q, label);
    }
  };
  walk(dict.en, dict.es, "", "i18n.es");
  walk(dict.es, dict.en, "", "i18n.en");
  return [...new Set(missing)];
}

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export default async function (eleventyConfig) {
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);

  // ---------- Static files ----------
  // Only the parts of brand/ the site links to are published: the official flyer (not generated),
  // the favicons, the QR codes, the social cards and the printable posters. The logos, the
  // alternate mark and the SVG masters stay in the repository for print and later reuse.
  for (const dir of ["flyer", "favicon", "qr", "social", "poster"]) eleventyConfig.addPassthroughCopy({ [`brand/${dir}`]: `brand/${dir}` });
  eleventyConfig.addPassthroughCopy("src/assets/img");
  eleventyConfig.addPassthroughCopy("src/assets/js");
  for (const f of ["CNAME", ".nojekyll", "favicon.ico", "humans.txt"]) eleventyConfig.addPassthroughCopy(`src/${f}`);
  // Self-hosted fonts (SIL Open Font License) from @fontsource: Inter (text), Fraunces (headings), and
  // the flyer's title lettering, Playfair Display Black ("THE INCREDIBLE") and Great Vibes ("Tapestry").
  const fonts = {};
  for (const w of [400, 500, 600, 700]) fonts[`node_modules/@fontsource/inter/files/inter-latin-${w}-normal.woff2`] = `assets/fonts/inter-latin-${w}-normal.woff2`;
  for (const w of [500, 600, 700]) fonts[`node_modules/@fontsource/fraunces/files/fraunces-latin-${w}-normal.woff2`] = `assets/fonts/fraunces-latin-${w}-normal.woff2`;
  fonts["node_modules/@fontsource/fraunces/files/fraunces-latin-500-italic.woff2"] = "assets/fonts/fraunces-latin-500-italic.woff2";
  fonts["node_modules/@fontsource/playfair-display/files/playfair-display-latin-900-normal.woff2"] = "assets/fonts/playfair-display-latin-900-normal.woff2";
  fonts["node_modules/@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff2"] = "assets/fonts/great-vibes-latin-400-normal.woff2";
  eleventyConfig.addPassthroughCopy(fonts);

  // ---------- Tailwind CSS, compiled before every build ----------
  // Into the real output folder: `directories.output` follows --output (the legacy `dir.output` stays
  // "_site"), relative to the working directory like Eleventy's own output.
  const cssOut = (directories) => path.resolve(directories.output, "assets/css/main.css");
  eleventyConfig.on("eleventy.before", async ({ directories }) => {
    const cli = path.join(__dirname, "node_modules/@tailwindcss/cli/dist/index.mjs");
    const input = path.join(__dirname, "src/assets/css/main.css");
    const output = cssOut(directories);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    execFileSync(process.execPath, [cli, "-i", input, "-o", output, ...(isProd ? ["--minify"] : [])], { stdio: "inherit" });
  });
  // A missing stylesheet fails loudly instead of leaving an unstyled site.
  eleventyConfig.on("eleventy.after", ({ directories }) => {
    if (!fs.existsSync(cssOut(directories))) throw new Error(`[css] ${cssOut(directories)} was not written`);
  });
  eleventyConfig.on("eleventy.before", () => {
    try { liveSite = JSON.parse(read("src/_data/site.json")); } catch { /* keep the last good copy */ }
  });

  // ---------- Key parity (en and es must have the same keys) ----------
  // In i18n.json and in every src/_data/pagecopy/*.json. Skip with SKIP_I18N_CHECK=1 while rewriting one.
  eleventyConfig.on("eleventy.before", () => {
    if (process.env.SKIP_I18N_CHECK === "1") return;
    const problems = [];
    for (const file of bilingualFiles()) {
      let dict;
      try { dict = JSON.parse(read(file)); } catch { continue; /* a parse error is reported by the data loader */ }
      for (const d of i18nKeyDiff(dict)) problems.push(`${file}: ${d.replace(/^i18n\./, "")}`);
    }
    if (problems.length) throw new Error(`en and es keys differ (set SKIP_I18N_CHECK=1 to build anyway):\n  - ${problems.join("\n  - ")}`);
  });

  // ---------- Tokens in prose data ----------
  // Safety net: the prose data files are loaded with every {token} already replaced, so a template
  // that forgets `| tokens` (or JSON-LD, the .ics files, the feed) still never prints a literal "{email}".
  // Templates apply `| tokens` anyway (it is idempotent).
  eleventyConfig.addDataExtension("json", (contents, filePath) => {
    const data = JSON.parse(contents);
    return isProse(filePath) ? deepTokens(data, { site: freshSite(), when }) : data;
  });
  // After the build: report any literal token that still reached the output.
  eleventyConfig.on("eleventy.after", ({ results }) => {
    const re = new RegExp(`\\{(${TOKEN_NAMES.join("|")})\\}`, "g");
    const hits = [];
    for (const r of results || []) {
      const found = String(r.content || "").match(re);
      if (found) hits.push(`${r.url || r.outputPath}: ${[...new Set(found)].join(" ")}`);
    }
    if (hits.length) console.warn(`[tokens] literal tokens in the output (fix the template or the data):\n  - ${hits.join("\n  - ")}`);
  });
  // After the build: the questions address is PRINTED once per page, in the questions band at the top of
  // the footer (and on the printable poster); everywhere else it is a labelled link. Count it in the visible text.
  eleventyConfig.on("eleventy.after", ({ results }) => {
    const email = (freshSite().contact || {}).email;
    if (!email) return;
    const twice = [];
    for (const r of results || []) {
      if (!String(r.outputPath || "").endsWith(".html")) continue;
      const text = String(r.content || "")
        .replace(/<head[\s>][\s\S]*?<\/head>/i, " ")
        .replace(/<(script|style|template)[\s>][\s\S]*?<\/\1>/gi, " ")
        .replace(/<[^>]*>/g, " ");
      const n = text.split(email).length - 1;
      // The printable poster is print media and prints the address itself, besides the footer band.
      const allowed = /\/poster\/$/.test(String(r.url || "")) ? 2 : 1;
      if (n > allowed) twice.push(`${r.url || r.outputPath}: ${n} times`);
    }
    if (twice.length) console.warn(`[email] the address is printed more than once on a page (link it with contact.linkText or [email the planning committee](mailto:{email}) instead):\n  - ${twice.join("\n  - ")}`);
  });

  eleventyConfig.addWatchTarget("src/assets/css/");
  eleventyConfig.addWatchTarget("src/_data/pagecopy/");
  eleventyConfig.addWatchTarget("brand/");

  // ---------- Filters ----------
  eleventyConfig.addFilter("md", (s) => md.render(mdLiteral(s)));
  eleventyConfig.addFilter("mdInline", (s) => md.renderInline(mdLiteral(s)));
  // Plain text for meta tags, JSON-LD, share messages and Add to calendar: drops the word joiners and
  // no-break spaces that keep times together on the web pages (scripts/lib/tokens.mjs).
  eleventyConfig.addFilter("plain", (s) => plain(s));
  eleventyConfig.addFilter("json", (v) => JSON.stringify(v));
  // {email}, {time}, {startsAlso}, … → real values (see scripts/lib/tokens.mjs). Apply to every
  // prose string from the data files, BEFORE | md / | mdInline: {{ copy.seventh.body[0] | tokens | md | safe }}
  eleventyConfig.addFilter("tokens", function (s) {
    const ctx = (this && this.ctx) || {};
    return applyTokens(s, { site: ctx.site || freshSite(), when: ctx.when || when });
  });
  // mailto: link with an encoded subject: {{ site.contact.email | mailto(t.contact.subject) }}
  eleventyConfig.addFilter("mailto", (email, subject = "") => (email ? `mailto:${email}${subject ? `?subject=${encodeURIComponent(String(subject))}` : ""}` : ""));
  // Give the plain mailto: links that markdown made from {email} a subject (rendered HTML in, HTML out):
  // {{ p | tokens | md | mailSubject(t.contact.subjectContribution) | safe }}
  eleventyConfig.addFilter("mailSubject", function (htmlStr, subject = "") {
    const email = (((this && this.ctx && this.ctx.site) || freshSite()).contact || {}).email;
    const s = String(htmlStr ?? "");
    if (!email || !subject) return s;
    return s.split(`href="mailto:${email}"`).join(`href="mailto:${email}?subject=${encodeURIComponent(String(subject))}"`);
  });
  // First item of a list whose `key` (or another field) equals value: site.event.interpretation | byKey("es")
  eleventyConfig.addFilter("byKey", (arr, value, field = "key") => (Array.isArray(arr) ? arr.find((x) => x && x[field] === value) : null) || null);
  eleventyConfig.addFilter("merge", (a, b) => ({ ...(a || {}), ...(b || {}) }));
  eleventyConfig.addFilter("roman", (n) => ROMAN[Number(n)] || String(n));
  eleventyConfig.addFilter("digits", (s) => String(s ?? "").replace(/\D/g, ""));
  eleventyConfig.addFilter("absUrl", (u) => new URL(u || "/", site.url).href);
  eleventyConfig.addFilter("legacy", (key) => site.legacies.find((l) => l.key === key) || null);
  eleventyConfig.addFilter("limit", (arr, n) => (Array.isArray(arr) ? arr.slice(0, n) : arr));
  eleventyConfig.addFilter("whereKey", (arr, key, value) => (arr || []).filter((x) => x && x[key] === value));
  eleventyConfig.addFilter("tel", (s) => "tel:" + String(s ?? "").replace(/[^\d+,#*]/g, ""));
  // "08:00" → "8:00 AM" (or "8:00 a. m." in Spanish), with no-break spaces like when.js so a time never wraps.
  eleventyConfig.addFilter("time12", (hhmm, locale = "en") => {
    if (!hhmm) return "";
    const out = DateTime.fromFormat(String(hhmm), "HH:mm").setLocale(locale).toFormat("h:mm a");
    const es = String(locale).startsWith("es") ? out.replace(/\s?(a|p)\.?\s?m\.?/i, (m, ap) => ` ${ap.toLowerCase()}. m.`) : out;
    return es.replace(/[ \u00A0\u202F]/g, "\u00A0");
  });
  // Glue a short phrase together with no-break spaces ("Meeting ID 824 7491 1898"), so it never wraps.
  eleventyConfig.addFilter("nbsp", (s) => String(s ?? "").replace(/ /g, "\u00A0"));
  // ISO date or datetime → formatted in the event's timezone. fmt is a Luxon format string.
  eleventyConfig.addFilter("date", (value, fmt = "DDD", locale = "en", zone = site.event.timezone) => {
    if (!value) return "";
    const dt = value instanceof Date ? DateTime.fromJSDate(value, { zone }) : DateTime.fromISO(String(value), { zone });
    return dt.isValid ? dt.setLocale(locale).toFormat(fmt) : String(value);
  });
  // When a page last changed (YYYY-MM-DD): the later of its template's and src/_data's last git commit,
  // so the scheduled rebuilds do not claim every page changed; the build date when git has no answer.
  // The sitemap's <lastmod> and the JSON-LD Article dateModified: {{ page.inputPath | lastmod }}
  const gitDates = new Map();
  eleventyConfig.on("eleventy.before", () => gitDates.clear());
  const gitDate = (p) => {
    if (!gitDates.has(p)) {
      let d = "";
      try {
        d = execFileSync("git", ["log", "-1", "--format=%cI", "--", p], { cwd: __dirname, stdio: ["ignore", "pipe", "ignore"] }).toString().trim().slice(0, 10);
      } catch { d = ""; }
      gitDates.set(p, d);
    }
    return gitDates.get(p);
  };
  eleventyConfig.addFilter("lastmod", (inputPath) => {
    const dataDate = gitDate("src/_data") || gitDate("src");
    const d = [inputPath ? gitDate(inputPath) : "", dataDate].filter(Boolean).sort().pop();
    return d || new Date().toISOString().slice(0, 10);
  });
  eleventyConfig.addFilter("dateISO", (value) => (value instanceof Date ? DateTime.fromJSDate(value) : DateTime.fromISO(String(value))).toISO());
  eleventyConfig.addFilter("rfc822", (value) => (value instanceof Date ? DateTime.fromJSDate(value) : DateTime.fromISO(String(value))).toRFC2822());
  // Spanish site paths: "/join/" → "/es/join/" when such a page exists (the workshop pages are all
  // translated; the study pages, /principles/…, are English only and fall back to /es/).
  // Add a path here when you add its /es/ twin.
  const esPages = new Set(["/", "/program/", "/join/", "/flyer/", "/faq/", "/poster/"]);
  eleventyConfig.addFilter("langUrl", (url, lang) => {
    const clean = String(url || "/").replace(/^\/es(?=\/)/, "") || "/";
    if (lang === "es") return esPages.has(clean) ? `/es${clean === "/" ? "/" : clean}` : "/es/";
    return clean;
  });

  // ---------- Shortcodes ----------
  // Inline a Lucide icon (ISC licence) with the given classes. Decorative by default; pass a label to make it meaningful.
  const iconCache = new Map();
  eleventyConfig.addShortcode("icon", (name, cls = "icon", label = "") => {
    const file = path.join(__dirname, "node_modules/lucide-static/icons", `${name}.svg`);
    if (!iconCache.has(name)) {
      if (!fs.existsSync(file)) throw new Error(`Unknown Lucide icon: ${name}`);
      iconCache.set(name, fs.readFileSync(file, "utf8").replace(/<!--[\s\S]*?-->/g, "").trim());
    }
    const a11y = label ? `role="img" aria-label="${String(label).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")}"` : 'aria-hidden="true" focusable="false"';
    return iconCache.get(name).replace(/<svg([^>]*)>/, (m, attrs) => `<svg${attrs.replace(/\s(width|height|class)="[^"]*"/g, "")} class="${cls}" ${a11y}>`);
  });
  // Inline any SVG from the repo (brand marks, QR codes) so it can be styled and scales crisply.
  // Every inclusion gets its own id suffix (clipPath ids etc.), so the same mark can appear
  // several times on one page without duplicate ids.
  const escAttr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  let svgInstance = 0;
  eleventyConfig.addShortcode("inlineSvg", (relPath, cls = "", label = "") => {
    const file = path.join(__dirname, relPath);
    if (!fs.existsSync(file)) return `<!-- missing ${relPath} -->`;
    const n = ++svgInstance;
    let svg = fs.readFileSync(file, "utf8").replace(/<\?xml[^>]*>/, "").replace(/<!--[\s\S]*?-->/g, "").trim();
    svg = svg.replace(/\sid="([^"]+)"/g, (m, id) => ` id="${id}-i${n}"`).replace(/url\(#([^)]+)\)/g, (m, id) => `url(#${id}-i${n})`).replace(/href="#([^"]+)"/g, (m, id) => `href="#${id}-i${n}"`);
    const a11y = label ? `role="img" aria-label="${escAttr(label)}"` : 'aria-hidden="true" focusable="false"';
    return svg.replace(/<svg([^>]*)>/, (m, attrs) => `<svg${attrs.replace(/\s(width|height|class|role|aria-label|aria-hidden|focusable)="[^"]*"/g, "")} class="${cls}" ${a11y}>`);
  });
  eleventyConfig.addShortcode("year", () => String(new Date().getFullYear()));

  // ---------- Output ----------
  eleventyConfig.addTransform("htmlmin", async function (content) {
    if (isProd && (this.page.outputPath || "").endsWith(".html")) {
      return minify(content, {
        collapseWhitespace: true,
        conservativeCollapse: true,
        removeComments: true,
        minifyCSS: true,
        minifyJS: true,
        keepClosingSlash: true,
      });
    }
    return content;
  });

  eleventyConfig.addGlobalData("isProd", isProd);
  eleventyConfig.setNunjucksEnvironmentOptions({ trimBlocks: true, lstripBlocks: true });
  eleventyConfig.setServerOptions({ showAllHosts: true, port: 8080 });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md", "11ty.js", "html"],
  };
}
