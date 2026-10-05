// The site menu, per language. Labels come from i18n.json (t.nav[key]); the meeting page is
// listed only once meeting.json says published: true.
import meeting from "./meeting.json" with { type: "json" };

const en = [
  { key: "home", href: "/" },
  { key: "schedule", href: "/schedule/" },
  { key: "principles", href: "/principles/" },
  ...(meeting.published ? [{ key: "meeting", href: "/meeting/" }] : []),
  { key: "accessibility", href: "/accessibility/" },
  { key: "poster", href: "/poster/" },
];

// Only a few pages exist in Spanish; the rest of the Spanish menu points to sections of /es/.
const es = [
  { key: "home", href: "/es/" },
  { key: "join", href: "/es/join/" },
  { key: "poster", href: "/es/poster/" },
];

export default { en, es };
