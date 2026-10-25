// Tokens: the ONE place the email, the date, the times and the Zoom numbers get into prose.
// Copy in copy.json / i18n.json / faq.json / updates.json / schedule.json writes them only as
// tokens ({email}, {time}, …); this module swaps in the real values from site.json + when.js.
// Used by the `tokens` Nunjucks filter (eleventy.config.js), the .ics generator
// (src/pages/workshop-ics.11ty.js) and scripts/build-brand.mjs, so every output says the same.
//
//   {email}          site.contact.email                  a44p69delegate@gmail.com
//   {date}/{dateEs}  when.date.long / longEs             Saturday, December 12, 2026 / sábado 12 de diciembre de 2026
//   {time}/{timeEs}  when.time.lead / leadEs             11:00 AM – 7:00 PM ET / 11:00 a. m. – 7:00 p. m. ET
//   {timeLong}/{timeLongEs}     when.time.leadLong(/Es)  11:00 AM – 7:00 PM Eastern Time (ET)
//   {startsAlso}/{startsAlsoEs} when.time.startsAlso(/Es) 8:00 AM PT · 9:00 AM MT · 10:00 AM CT
//   {rangesAlso}/{rangesAlsoEs} when.time.rangesAlso(/Es) 8:00 AM – 4:00 PM PT · …
//   {start}/{startEs}           when.time.startZone(/Es)  11:00 AM ET / 11:00 a. m. ET (the flyer's "Starting at 11am ET")
//   {zoomId}         site.event.zoom.meetingId           824 7491 1898 (with no-break spaces, so it never wraps)
//   {passcode}       site.event.zoom.passcode
// Extras (harmless if unused): {endsAlso}/{endsAlsoEs}, {timeShort}/{timeShortEs}, {domain}, {url},
// {pdfSize}/{jpgSize} (site.flyer), {joinUrl}.
// The times from when.js carry no-break spaces (U+00A0) inside each time and range and before each " · ",
// and an invisible word joiner (U+2060) after the range's dash. They only matter for line breaks on the web
// pages; plain-text outputs (the .ics file, the social cards, Add to calendar, share messages, meta tags,
// JSON-LD) pass through plain() below, which turns them back into ordinary spaces.
//
// {email}: every page prints the address itself at most ONCE (questions card, flyer text or poster
// line). In prose, link to it — [email the planning committee](mailto:{email}) — instead of a bare {email}.

export function tokenMap({ site = {}, when = {} } = {}) {
  const t = when.time || {};
  const d = when.date || {};
  const ev = site.event || {};
  const z = ev.zoom || {};
  const fl = site.flyer || {};
  return {
    email: (site.contact && site.contact.email) || "",
    date: d.long,
    dateEs: d.longEs,
    time: t.lead,
    timeEs: t.leadEs,
    timeLong: t.leadLong,
    timeLongEs: t.leadLongEs,
    timeShort: t.leadShort,
    timeShortEs: t.leadShortEs,
    startsAlso: t.startsAlso,
    startsAlsoEs: t.startsAlsoEs,
    endsAlso: t.endsAlso,
    endsAlsoEs: t.endsAlsoEs,
    rangesAlso: t.rangesAlso,
    rangesAlsoEs: t.rangesAlsoEs,
    start: t.startZone,
    startEs: t.startZoneEs,
    zoomId: z.meetingId ? String(z.meetingId).replace(/ /g, "\u00A0") : z.meetingId,
    passcode: z.passcode,
    joinUrl: z.joinUrl,
    domain: site.domain,
    url: site.url,
    pdfSize: fl.pdfSize,
    jpgSize: fl.jpgSize,
  };
}

const TOKEN_RE = /\{([A-Za-z][A-Za-z0-9]*)\}/g;
const warned = new Set();

// Replace every known {token} in a string. Unknown {words} are left alone (and reported once),
// so a typo shows up in the build log instead of silently vanishing.
export function applyTokens(value, ctx, map = tokenMap(ctx)) {
  if (typeof value !== "string" || value.indexOf("{") === -1) return value;
  return value.replace(TOKEN_RE, (m, key) => {
    if (Object.prototype.hasOwnProperty.call(map, key) && map[key] !== undefined && map[key] !== null) return String(map[key]);
    if (!warned.has(key)) {
      warned.add(key);
      console.warn(`[tokens] unknown or empty token ${m} left as is (known: ${Object.keys(map).join(", ")})`);
    }
    return m;
  });
}

// Apply tokens to every string inside an object/array (returns a copy).
export function deepTokens(value, ctx, map = tokenMap(ctx)) {
  if (typeof value === "string") return applyTokens(value, ctx, map);
  if (Array.isArray(value)) return value.map((v) => deepTokens(v, ctx, map));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = deepTokens(v, ctx, map);
    return out;
  }
  return value;
}

// Plain text for places that do not wrap like a web page: no word joiners, ordinary spaces.
export const plain = (s) => String(s ?? "").replace(/⁠/g, "").replace(/[  ]/g, " ");

// The literal tokens that must never reach the built site (used by the post-build check).
export const TOKEN_NAMES = Object.keys(tokenMap());
