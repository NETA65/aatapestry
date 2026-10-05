# Editing the site

Everything is data. You never edit HTML. Change a value in one of the JSON files in `src/_data/`,
push to `main` (or edit the file on github.com and press *Commit*), and GitHub rebuilds the site in
about two minutes. Each file has a `_readme` field at the top that explains it.

## The one file you will touch most: `src/_data/site.json`

| Field | What it changes |
| --- | --- |
| `name`, `shortName`, `title`, `tagline`, `hook` | the site name, browser titles, hero, wordmark text, social cards |
| `description` | the default meta description and the `Event` description for search engines |
| `url`, `domain` | canonical links, sitemap, QR code for the site, poster footer |
| `event.date`, `event.start`, `event.end`, `event.timezone` | **every** date and time on the site, the countdown, the time-zone table, the .ics file, JSON-LD, the poster and social cards. Times are 24-hour `HH:MM` in the given IANA timezone |
| `event.lunch` | the lunch line (`start` may be `null` while undecided; `tentative: true` shows the badge) |
| `event.status` | `scheduled` · `postponed` · `cancelled` — changes the schema.org status and the .ics status |
| `event.cost`, `event.audience`, `event.recording` | the facts strip and FAQ-style notes |
| `event.registration` | `required: true` + `url` shows a *Register* button; the `note` text shows otherwise |
| `event.interpretation` | the badges, accessibility notes and poster line (`labelEs` is the Spanish label) |
| `event.zoom.*` | meeting ID, passcode, join link, dial-in numbers → Zoom card, poster, **QR code**, .ics, JSON-LD. Easier: Actions → *Update Zoom info* |
| `event.calendarSequence` | bumped automatically when Zoom details change (calendar apps then update the invite) |
| `legacies[]` | the three legacies' names, colours and blurbs (colours also live in `src/assets/css/main.css`) |
| `contact.email` | shows the contact block, the accessibility-request link and the .ics organizer; empty hides them |
| `github.owner` | enables the "Source code" footer link before the first deploy (CI fills it in automatically afterwards) |
| `disclaimer`, `copyrightNotice` | footer notices (Spanish versions live in `i18n.json → es.footer`) |

## The program: `schedule.json`

- `status`: `tentative` shows the *Tentative* badge and the `note`; `final` shows *Final program*.
- `showSessions`: `false` shows only the framework (room opens, start, lunch, end). Set `true` to
  publish the `sessions` list. Edit titles, times and summaries freely; `legacy` colours the row.

## The weekly meeting: `meeting.json`

Set `published: true`, then `weekday` (e.g. `"tuesday"`), `time` (`"19:00"`), `zoom`, and
`cycle.startDate` = the date of the meeting that studied **number 1**. The meeting page then shows
*this week's* number, the next twelve dates and a recurring calendar file, and the menu gains a
*Meeting* link. `cycle.mode` is `by-number` (12-week cycle, all three legacies each week) or
`by-principle` (36 weeks: Step 1, Tradition 1, Concept I, Step 2 …). The Monday rebuild keeps it current.

## News: `updates.json`

Add an item at the top (`date`, `title`, `body`). It appears on the home page and in `/feed.xml`.

## Words: `copy.json`, `faq.json`, `i18n.json`

- `copy.json` — every English paragraph, heading and button label, grouped by section. Fields marked
  `(md)` in the `_readme` accept simple Markdown (**bold**, links, lists).
- `faq.json` — the questions and answers (also published as `FAQPage` structured data).
- `i18n.json` — UI labels and the Spanish landing/poster/join text. `en` and `es` have the same keys;
  the build fails loudly if a key is missing in one language.

## The 36 principles: `principles.json`

One entry per number with `step`, `tradition`, `concept` and `thread` (title, one-liner, summary,
"where it shows up", three questions). Each of the three has a one-word `principle`, a short `gist`
in our own words, `keywords`, and a `text` field that ships **empty**. While `text` is empty the pages
show the gist and a "Read Step N at aa.org" link (the `sources` block at the top of the file). If the
committee prefers to show the official short-form wording on the site, paste it into `text` from your
own A.A. literature (Big Book pp. 59–60 and Appendix I; *The A.A. Service Manual*), keep the A.A.W.S.
credit line in `notice`, and the pages switch to showing the text automatically. The interpretive
parts are the committee's own and may be edited freely.

## The logo and brand files

There are two marks, each with a complete file set (see `brand/BRAND.md`):

- **Primary** (`brand/logo/`): the circle-and-triangle with Unity · Service · Recovery on the sides and the
  three-circle Venn inside. It is *generated* by `scripts/make-aa-mark.mjs` from a handful of numbers
  (ring size, triangle size, circle radius, word size, colours from `site.json`). To change it, edit those
  numbers and run `npm run brand:mark`, then `npm run build:brand`.
- **Alternate** (`brand/alt-weave/logo/`): the three woven triangles. Its masters are
  `brand/src/weave/mark.svg` and `mark-mono.svg`; edit them in Inkscape or Illustrator (keep the
  1024 × 1024 viewBox, no text, no gradients or filters).

`npm run build:brand` (or any push — CI runs it) regenerates every PNG/PDF/favicon/QR/social file for
both marks. The site header and favicons use the primary mark's `plain` version (no words).

## Design tokens

Colours, fonts and component styles are in `src/assets/css/main.css` (Tailwind v4 `@theme` block
and plain CSS components). Dark mode follows the visitor's system setting; the footer has a toggle.

## Checking your work

`npm start` serves the site at <http://localhost:8080> with live reload. `npm run build && npm test`
validates the HTML and every internal link. The *Build & Deploy* run on GitHub shows the same checks
and a summary of the Zoom details it published.
