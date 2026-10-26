// The site menu, per language. Labels come from i18n.json (t.nav[key]). The header shows `main`;
// the footer shows `main` under "The workshop" and `resources` under "Resources". The study pages
// (/principles/) and the updates feed are English only, so the Spanish menus mark those links as
// English (lang: "en"). The calendar file is a plain link (no `download`): iOS Safari then offers to
// add the event. `type` (optional) is the linked file's media type.
import calendar from "./calendar.js";

const icsPath = (lang) => calendar.ics[lang];
// The updates feed (eleventy.config.js → /feed.xml, entries in site.json → updates).
const feed = { key: "feed", href: "/feed.xml", type: "application/atom+xml" };

const en = {
  main: [
    { key: "program", href: "/program/" },
    { key: "join", href: "/join/" },
    { key: "flyer", href: "/flyer/" },
    { key: "faq", href: "/faq/" },
    { key: "principles", href: "/principles/" },
  ],
  resources: [
    { key: "poster", href: "/poster/" },
    { key: "calendarFile", href: icsPath("en") },
    feed,
  ],
};

const es = {
  main: [
    { key: "program", href: "/es/program/" },
    { key: "join", href: "/es/join/" },
    { key: "flyer", href: "/es/flyer/" },
    { key: "faq", href: "/es/faq/" },
  ],
  resources: [
    { key: "principles", href: "/principles/", lang: "en" },
    { key: "poster", href: "/es/poster/" },
    { key: "calendarFile", href: icsPath("es") },
    { ...feed, lang: "en" },
  ],
};

export default { en, es };
