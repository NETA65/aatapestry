// sitemap.xml — every indexable page, with hreflang alternates for the bilingual ones.
// <lastmod> is the later of the template's and the data folder's last git commit (so the
// scheduled rebuilds do not claim every page changed); falls back to the build date.
import { execSync } from "node:child_process";

const gitDate = (p) => {
  try {
    return execSync(`git log -1 --format=%cI -- "${p}"`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim().slice(0, 10);
  } catch {
    return "";
  }
};

export default class {
  data() {
    return { permalink: "/sitemap.xml", eleventyExcludeFromCollections: true, layout: false };
  }
  render({ collections, site, build }) {
    const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
    const pages = collections.all.filter((p) => p.url && p.url.endsWith("/") && !p.data.noindex && p.data.layout !== false && p.data.eleventyExcludeFromCollections !== "true");
    const abs = (u) => new URL(u, site.url).href;
    const dataDate = gitDate("src/_data") || gitDate("src");
    const lastmodFor = (p) => {
      const t = gitDate(p.inputPath);
      const d = [t, dataDate].filter(Boolean).sort().pop();
      return d || build.time.slice(0, 10);
    };
    const TOP = new Set(["/es/", "/program/", "/es/program/", "/join/", "/es/join/", "/flyer/", "/es/flyer/", "/faq/", "/es/faq/", "/principles/"]);
    const priority = (u) => (u === "/" ? "1.0" : TOP.has(u) ? "0.9" : u.startsWith("/principles/") ? "0.7" : "0.6");
    const alt = (p) => {
      if (!p.data.translated) return "";
      const en = p.url.replace(/^\/es(?=\/)/, "") || "/";
      const es = en === "/" ? "/es/" : `/es${en}`;
      return `\n    <xhtml:link rel="alternate" hreflang="en" href="${esc(abs(en))}"/>\n    <xhtml:link rel="alternate" hreflang="es" href="${esc(abs(es))}"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(abs(en))}"/>`;
    };
    const urls = pages
      .sort((a, b) => a.url.localeCompare(b.url))
      .map((p) => `  <url>\n    <loc>${esc(abs(p.url))}</loc>\n    <lastmod>${lastmodFor(p)}</lastmod>\n    <changefreq>${p.url === "/" ? "daily" : "weekly"}</changefreq>\n    <priority>${priority(p.url)}</priority>${alt(p)}\n  </url>`)
      .join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
  }
}
