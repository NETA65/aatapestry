// The site menu, per language. Labels come from i18n.json (t.nav[key]). Items marked mobileOnly
// are left out of the desktop bar (the brand link is "Home" there). The weekly meeting page is
// listed only once meeting.json says published: true.
import meeting from "./meeting.json" with { type: "json" };

const en = [
  { key: "home", href: "/", mobileOnly: true },
  { key: "schedule", href: "/schedule/" }, // "Program"
  { key: "flyer", href: "/flyer/" },
  { key: "accessibility", href: "/accessibility/" },
  { key: "principles", href: "/principles/" },
  ...(meeting.published ? [{ key: "meeting", href: "/meeting/" }] : []),
  { key: "questions", href: "/#questions" },
];

// Only a few pages exist in Spanish; the rest of the Spanish menu points to sections of /es/.
const es = [
  { key: "home", href: "/es/", mobileOnly: true },
  { key: "join", href: "/es/join/" }, // "Cómo unirse"
  { key: "flyer", href: "/es/flyer/" }, // "Volante"
  { key: "poster", href: "/es/poster/" }, // "Póster en español"
  { key: "questions", href: "/es/#preguntas" },
];

export default { en, es };
