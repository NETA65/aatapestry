// Shared text-to-outline helpers (opentype.js + wawoff2). Used by make-aa-mark.mjs and build-brand.mjs.
// Glyphs are laid out by hand (advance widths + kerning) instead of opentype's shaper, which rejects
// some OpenType features in these fonts; malformed path commands degrade to lines instead of breaking a glyph.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import wawoff2 from "wawoff2";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function loadFont(rel) {
  const woff2 = fs.readFileSync(path.join(root, "node_modules", rel));
  const ttf = await wawoff2.decompress(woff2);
  return opentype.parse(ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength));
}

const n2 = (v) => (Math.round(v * 100) / 100).toString();
export function commandsToD(commands) {
  let d = "";
  const ok = (...vals) => vals.every((v) => Number.isFinite(v));
  for (const c of commands) {
    switch (c.type) {
      case "M": if (ok(c.x, c.y)) d += `M${n2(c.x)} ${n2(c.y)}`; break;
      case "L": if (ok(c.x, c.y)) d += `L${n2(c.x)} ${n2(c.y)}`; break;
      case "Q": d += ok(c.x1, c.y1, c.x, c.y) ? `Q${n2(c.x1)} ${n2(c.y1)} ${n2(c.x)} ${n2(c.y)}` : ok(c.x, c.y) ? `L${n2(c.x)} ${n2(c.y)}` : ""; break;
      case "C": d += ok(c.x1, c.y1, c.x2, c.y2, c.x, c.y) ? `C${n2(c.x1)} ${n2(c.y1)} ${n2(c.x2)} ${n2(c.y2)} ${n2(c.x)} ${n2(c.y)}` : ok(c.x, c.y) ? `L${n2(c.x)} ${n2(c.y)}` : ""; break;
      case "Z": d += "Z"; break;
      default: break;
    }
  }
  return d;
}

// Lay out `text` starting at (x, y baseline). letterSpacing is in em. Returns { d, width }.
export function layout(font, text, x, y, size, { letterSpacing = 0 } = {}) {
  const scale = size / font.unitsPerEm;
  const glyphs = Array.from(String(text)).map((ch) => font.charToGlyph(ch));
  let cx = x, d = "";
  glyphs.forEach((g, i) => {
    d += commandsToD(g.getPath(cx, y, size).commands);
    cx += (g.advanceWidth || 0) * scale + letterSpacing * size;
    if (i < glyphs.length - 1) {
      try { cx += (font.getKerningValue(g, glyphs[i + 1]) || 0) * scale; } catch { /* no kerning data */ }
    }
  });
  return { d, width: cx - x - letterSpacing * size };
}
export const textWidth = (font, text, size, opts = {}) => layout(font, text, 0, 0, size, opts).width;
export const textPath = (font, text, x, y, size, fill, opts = {}) => `<path d="${layout(font, text, x, y, size, opts).d}" fill="${fill}"/>`;
export const centered = (font, text, cx, y, size, fill, opts = {}) => textPath(font, text, cx - textWidth(font, text, size, opts) / 2, y, size, fill, opts);
export const fitSize = (font, text, maxW, max, min, opts = {}) => { let s = max; while (s > min && textWidth(font, text, s, opts) > maxW) s -= 1; return s; };
export function wrap(font, text, size, maxW) {
  const lines = []; let cur = "";
  for (const w of String(text).split(/\s+/)) {
    const test = cur ? `${cur} ${w}` : w;
    if (cur && textWidth(font, test, size) > maxW) { lines.push(cur); cur = w; } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}
