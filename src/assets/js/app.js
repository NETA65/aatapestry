/* The Incredible Tapestry — small, dependency-free enhancements.
   Everything on the page already works without this file; it adds:
   live countdown · the visitor's local time · copy buttons · native share · theme toggle (Alpine). */
(() => {
  "use strict";
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const lang = document.documentElement.lang || "en";
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ""; } })();

  /* ---------- Local time: "Your local time: 11:00 AM – 7:00 PM EST" ---------- */
  $$("[data-local-time]").forEach((el) => {
    const start = new Date(el.dataset.start), end = new Date(el.dataset.end);
    if (Number.isNaN(start.getTime()) || !tz || tz === el.dataset.tz) return;
    const timeFmt = new Intl.DateTimeFormat(lang, { hour: "numeric", minute: "2-digit" });
    const zoneFmt = new Intl.DateTimeFormat(lang, { timeZoneName: "short" });
    const dateFmt = new Intl.DateTimeFormat(lang, { weekday: "long", month: "long", day: "numeric" });
    const zone = (zoneFmt.formatToParts(start).find((p) => p.type === "timeZoneName") || {}).value || tz;
    const sameDay = start.toDateString() === end.toDateString();
    let text = `${timeFmt.format(start)} – ${timeFmt.format(end)} ${zone}`;
    if (!sameDay) text = `${dateFmt.format(start)}, ${timeFmt.format(start)} – ${dateFmt.format(end)}, ${timeFmt.format(end)} ${zone}`;
    else if (el.dataset.withDate) text = `${dateFmt.format(start)}, ${text}`;
    const target = el.querySelector("[data-local-value]") || el;
    target.textContent = text;
    el.hidden = false;
  });
  // Highlight the visitor's zone in the time-zone table.
  if (tz) $$("[data-zone]").forEach((row) => { if (row.dataset.zone === tz) row.classList.add("is-local"); });

  /* ---------- Countdown ---------- */
  $$("[data-countdown]").forEach((root) => {
    const start = new Date(root.dataset.start), end = new Date(root.dataset.end);
    if (Number.isNaN(start.getTime())) return;
    let labels = {};
    try { labels = JSON.parse(root.dataset.labels || "{}"); } catch { labels = {}; }
    const tiles = root.querySelector("[data-cd-tiles]");
    const state = root.querySelector("[data-cd-state]");
    const label = root.querySelector("[data-cd-label]");
    const nums = Object.fromEntries(["days", "hours", "minutes", "seconds"].map((k) => [k, root.querySelector(`[data-cd="${k}"]`)]));
    const liveBadges = $$("[data-live-badge]");
    const pad = (n) => String(n).padStart(2, "0");
    let timer;
    const tick = () => {
      const now = new Date();
      if (now >= end) {
        if (tiles) tiles.hidden = true;
        if (label) label.hidden = true;
        if (state) { state.textContent = labels.concluded || "This workshop has concluded."; state.hidden = false; }
        clearInterval(timer);
        return;
      }
      if (now >= start) {
        if (tiles) tiles.hidden = true;
        if (label) label.hidden = true;
        if (state) { state.textContent = labels.happeningNow || "Happening now"; state.hidden = false; state.classList.add("is-live"); }
        liveBadges.forEach((b) => (b.hidden = false));
        return;
      }
      let ms = start - now;
      const d = Math.floor(ms / 864e5); ms -= d * 864e5;
      const h = Math.floor(ms / 36e5); ms -= h * 36e5;
      const m = Math.floor(ms / 6e4); ms -= m * 6e4;
      const s = Math.floor(ms / 1e3);
      if (nums.days) nums.days.textContent = d;
      if (nums.hours) nums.hours.textContent = pad(h);
      if (nums.minutes) nums.minutes.textContent = pad(m);
      if (nums.seconds) nums.seconds.textContent = pad(s);
      if (label && d === 0 && labels.today) label.textContent = labels.today;
    };
    tick();
    timer = setInterval(tick, 1000);
  });

  /* ---------- Copy buttons ---------- */
  $$("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const text = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "absolute"; ta.style.left = "-9999px";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch { /* ignore */ }
        ta.remove();
      }
      const span = btn.querySelector("span:not(.sr-only)");
      const original = span ? span.textContent : btn.textContent;
      if (span) span.textContent = btn.dataset.copied || "Copied!"; else btn.textContent = btn.dataset.copied || "Copied!";
      btn.classList.add("is-done");
      setTimeout(() => { if (span) span.textContent = original; else btn.textContent = original; btn.classList.remove("is-done"); }, 1800);
    });
  });

  /* ---------- Native share ---------- */
  $$("[data-share-root]").forEach((root) => {
    const btn = root.querySelector("[data-share]");
    if (!btn || !navigator.share) return;
    btn.hidden = false;
    btn.addEventListener("click", () => {
      navigator.share({ title: root.dataset.title, text: root.dataset.text, url: root.dataset.url }).catch(() => {});
    });
  });

  /* ---------- Poster: ?size=a4 renders the A4 variant (used by scripts/pdf.mjs) ---------- */
  try {
    const size = new URLSearchParams(location.search).get("size");
    if (size === "a4") document.documentElement.dataset.size = "a4";
  } catch { /* ignore */ }

  /* ---------- Alpine components ---------- */
  document.addEventListener("alpine:init", () => {
    if (!window.Alpine) return;
    window.Alpine.data("theme", () => ({
      dark: (() => {
        const saved = (() => { try { return localStorage.getItem("theme"); } catch { return null; } })();
        if (saved === "dark" || saved === "light") return saved === "dark";
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
      })(),
      toggle() {
        this.dark = !this.dark;
        document.documentElement.dataset.theme = this.dark ? "dark" : "light";
        try { localStorage.setItem("theme", this.dark ? "dark" : "light"); } catch { /* ignore */ }
      },
    }));
  });
})();
