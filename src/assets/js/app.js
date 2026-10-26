/* The Incredible Tapestry — small, dependency-free enhancements.
   Every page works without this file (links, the menu's no-JS fallback, the calendar file);
   it adds: the mobile menu · copy buttons · native share · the visitor's local time ·
   the countdown · the Add to calendar menu's keyboard and outside-click behaviour.
   (The "js" class and <html data-phase> are set earlier, by an inline script in partials/head.njk,
   so the page is styled right from the first paint.) */
(() => {
  "use strict";
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const lang = document.documentElement.lang || "en";
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ""; } })();
  document.documentElement.classList.add("js");

  /* ---------- Mobile menu ---------- */
  // The button's name stays "Menu"; aria-expanded says whether it is open (only the icon changes).
  const toggle = document.querySelector("[data-menu-toggle]");
  const menu = toggle && document.getElementById(toggle.getAttribute("aria-controls"));
  if (toggle && menu) {
    const setOpen = (open, focusToggle) => {
      toggle.setAttribute("aria-expanded", String(open));
      menu.hidden = !open;
      if (!open && focusToggle) toggle.focus();
    };
    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) setOpen(false, true); });
    document.addEventListener("click", (e) => { if (!menu.hidden && !menu.contains(e.target) && !toggle.contains(e.target)) setOpen(false); });
    menu.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
    // Tabbing out of the open menu closes it, so it never covers the control that now has focus
    // (WCAG 2.4.11). Focus is already moving: do not move it. Shift+Tab back to the button keeps it open.
    menu.addEventListener("focusout", (e) => {
      const to = e.relatedTarget;
      if (!menu.hidden && to && !menu.contains(to) && !toggle.contains(to)) setOpen(false);
    });
    // Keep in step with the header's breakpoint (main.css, --breakpoint-nav).
    window.matchMedia("(min-width: 64rem)").addEventListener("change", (e) => { if (e.matches) setOpen(false); });
  }

  /* ---------- Copy buttons ---------- */
  // One polite live region tells screen-reader users the copy worked.
  const live = document.createElement("div");
  live.className = "sr-only";
  live.setAttribute("aria-live", "polite");
  document.body.appendChild(live);
  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* fall back below */ }
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    ta.remove();
    return ok;
  };
  $$("[data-copy]").forEach((btn) => {
    const span = btn.querySelector("span:not(.sr-only)");
    const original = span ? span.textContent : "";
    btn.addEventListener("click", async () => {
      if (!(await copyText(btn.dataset.copy))) return;
      const done = btn.dataset.copied || "Copied";
      btn.classList.add("is-copied");
      if (span) span.textContent = done;
      live.textContent = "";
      setTimeout(() => { live.textContent = done; }, 50);
      clearTimeout(btn._t);
      btn._t = setTimeout(() => { btn.classList.remove("is-copied"); if (span) span.textContent = original; }, 2200);
    });
  });

  /* ---------- Native share (shown only where the browser supports it) ---------- */
  $$("[data-share]").forEach((btn) => {
    const root = btn.closest("[data-share-root]");
    if (!root || !navigator.share) return;
    btn.hidden = false;
    btn.addEventListener("click", () => {
      navigator.share({ title: root.dataset.title, text: root.dataset.text, url: root.dataset.url }).catch(() => {});
    });
  });

  /* ---------- The visitor's local time ---------- */
  // Spanish uses es-US so times are 12-hour and zones read "EST", not "GMT-5"; "a.m." becomes the page's "a. m.".
  const loc = lang === "es" ? "es-US" : "en-US";
  const NB = " ";
  const timeFmt = new Intl.DateTimeFormat(loc, { hour: "numeric", minute: "2-digit", hour12: true });
  const fmtTime = (d) => {
    const s = timeFmt.format(d).replace(/[\s ]+/g, NB);
    return lang === "es" ? s.replace(/\s?([ap])\.\s?m\./gi, (m, ap) => `${NB}${ap.toLowerCase()}.${NB}m.`) : s;
  };
  // Offset in minutes east of UTC written in an ISO string ("…-05:00" → -300), or null.
  const isoOffset = (iso) => { const m = /([+-])(\d{2}):?(\d{2})$/.exec(iso || ""); return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : null; };
  $$("[data-local-time]").forEach((el) => {
    const start = new Date(el.dataset.start), end = new Date(el.dataset.end);
    if (Number.isNaN(start.getTime()) || !tz || tz === el.dataset.tz) return;
    // Same clock as the event (e.g. Toronto or Detroit for an Eastern event): nothing to add.
    const evOffset = isoOffset(el.dataset.start);
    if (evOffset !== null && -start.getTimezoneOffset() === evOffset && -end.getTimezoneOffset() === evOffset) return;
    const zoneFmt = new Intl.DateTimeFormat(loc, { timeZoneName: "short" });
    const dateFmt = new Intl.DateTimeFormat(loc, { weekday: "long", month: "long", day: "numeric" });
    const zone = (zoneFmt.formatToParts(start).find((p) => p.type === "timeZoneName") || {}).value || tz;
    const sameDay = start.toDateString() === end.toDateString();
    const localDay = start.toLocaleDateString("en-CA");
    const eventDay = String(el.dataset.start).slice(0, 10);
    // Each time and its zone stay whole; the range may break after its dash on a narrow card or a large font.
    let text = `${fmtTime(start)}${NB}– ${fmtTime(end)}${NB}${zone}`;
    if (!sameDay) text = `${dateFmt.format(start)}, ${fmtTime(start)} – ${dateFmt.format(end)}, ${fmtTime(end)}${NB}${zone}`;
    else if (el.dataset.withDate || localDay !== eventDay) text = `${dateFmt.format(start)}, ${text}`;
    (el.querySelector("[data-local-value]") || el).textContent = text;
    el.hidden = false;
  });
  // Highlight the visitor's zone in a time-zone table.
  if (tz) $$("[data-zone]").forEach((row) => { if (row.dataset.zone === tz) row.classList.add("is-local"); });

  /* ---------- Countdown ("47 days to go" → "Starts in 2 h 10 min" → "Happening now") ---------- */
  // The pill is role="timer" (not announced as it changes). Only a change of phase while the page is
  // open (the start, the end) is announced, through the polite live region above. The phase also goes
  // on <html data-phase>, which hides the Join and Add to calendar buttons once the workshop has ended.
  $$("[data-countdown]").forEach((el) => {
    const start = new Date(el.dataset.start), end = new Date(el.dataset.end);
    if (Number.isNaN(start.getTime())) return;
    let L = {};
    try { L = JSON.parse(el.dataset.labels || "{}"); } catch { L = {}; }
    const out = el.querySelector("[data-countdown-text]") || el;
    // Placeholders are written %n, %h, %m, %start (not {n}: braces are the build's token syntax).
    const fill = (s, map) => String(s || "").replace(/%([a-z]+)/gi, (m, k) => (k in map ? map[k] : m));
    const tick = () => {
      const now = new Date();
      let phase = "upcoming", text;
      if (now >= end) { phase = "ended"; text = L.ended; }
      else if (now >= start) { phase = "live"; text = L.live; }
      else {
        const ms = start - now;
        // Calendar days between today and the start day, in the visitor's own time zone.
        const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const dayDiff = Math.round((midnight(start) - midnight(now)) / 864e5);
        if (ms < 12 * 36e5) {
          // Minutes rounded up, so it never says "0 min"; the last hour reads "Starts in 10 min".
          const mins = Math.ceil(ms / 6e4), h = Math.floor(mins / 60), m = mins % 60;
          text = fill(h === 0 ? (L.startsInMin || L.startsIn) : L.startsIn, { h, m });
        }
        else if (dayDiff <= 0) text = fill(L.today, { start: el.dataset.startLabel || "" });
        else if (dayDiff === 1) text = L.tomorrow;
        else text = fill(L.days, { n: dayDiff });
      }
      // Write only a changed text (an identical rewrite is still a DOM change).
      if (text && out.textContent !== text) out.textContent = text;
      if (el.dataset.phase && el.dataset.phase !== phase && (phase === "live" || phase === "ended")) {
        live.textContent = "";
        setTimeout(() => { live.textContent = text; }, 50);
      }
      el.dataset.phase = phase;
      document.documentElement.dataset.phase = phase;
      el.hidden = false;
      if (phase === "ended") return;
      // Every 15 s in the last 13 hours (the minutes change), otherwise every minute.
      setTimeout(tick, phase === "upcoming" && start - now <= 36e5 * 13 ? 15e3 : 6e4);
    };
    tick();
  });

  /* ---------- Add to calendar menus (<details class="cal-menu">) ---------- */
  const menus = $$("details.cal-menu");
  const place = (d) => {
    const panel = d.querySelector(".cal-menu-panel");
    if (!panel) return;
    panel.style.left = "0px";
    const r = panel.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    let shift = 0;
    if (r.right > vw - 12) shift = vw - 12 - r.right;
    if (r.left + shift < 12) shift = 12 - r.left;
    panel.style.left = `${shift}px`;
  };
  menus.forEach((d) => {
    d.addEventListener("toggle", () => {
      if (!d.open) return;
      menus.forEach((o) => { if (o !== d) o.open = false; });
      place(d);
    });
    d.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && d.open) { d.open = false; d.querySelector("summary").focus(); }
    });
    // Tabbing out closes the panel, so it never covers the next control (WCAG 2.4.11). Requiring a
    // relatedTarget keeps a mouse click on an item (Safari does not focus links) from closing it early.
    d.addEventListener("focusout", (e) => {
      if (d.open && e.relatedTarget && !d.contains(e.relatedTarget)) d.open = false;
    });
  });
  document.addEventListener("click", (e) => { menus.forEach((d) => { if (d.open && !d.contains(e.target)) d.open = false; }); });
  window.addEventListener("resize", () => menus.forEach((d) => d.open && place(d)));
})();
