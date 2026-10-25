# Editing the site

Everything is data. You never edit HTML. Change a value in one of the JSON files in `src/_data/`,
push to `main` (or edit the file on github.com and press *Commit*), and GitHub rebuilds the site in
about two minutes. Each file has a `_readme` field at the top that explains it.

The workshop: **Saturday, December 12, 2026, 11:00 AM – 7:00 PM Eastern (ET)** = 8:00 AM PT ·
9:00 AM MT · 10:00 AM CT, on Zoom, with Spanish and ASL interpretation. Free; contributions welcome;
no pre-registration. Questions: a44p69delegate@gmail.com. The site always leads with Eastern time.

## The one file you will touch most: `src/_data/site.json`

| Field | What it changes |
| --- | --- |
| `name`, `shortName`, `title`, `tagline`, `hook` | the site name, browser titles, hero, wordmark text, social cards. `name` and `tagline` are also drawn into the logo wordmark files, so changing them changes `brand/logo/` |
| `subtitle` | the flyer's sub-line ("How the Steps, Traditions and Concepts weave this incredible tapestry") under the hero title and on the social cards. Spanish: `i18n.json → es.landing.subline` |
| `description`, `metaDescription` | the default meta description, the `Event` description for search engines and the app manifest. **Plain text with the time written out** (11 AM–7 PM ET): update them by hand if the date or time changes |
| `url`, `domain` | canonical links, sitemap, QR code for the site, poster footer |
| `event.date`, `event.start`, `event.end`, `event.timezone` | **every** date and time on the site, the countdown, the time-zone table, the .ics file, JSON-LD, the poster and social cards, and the time/date tokens (below). Times are 24-hour `HH:MM` in the given IANA timezone; now `2026-12-12`, `11:00`–`19:00`, `America/New_York` |
| `event.timezoneShort`, `event.timezoneLabel`, `event.timezoneLabelEs` | the zone labels: `ET`, `Eastern Time`, `hora del Este`. They are typed, not computed, so change them together with `event.timezone`. Write ET (EST only where an exact abbreviation is shown), never "EDT": December is standard time (the current flyer prints ET too) |
| `event.status` | `scheduled` · `postponed` · `cancelled` — changes the schema.org status and the .ics status |
| `event.cost`, `event.audience` | the facts strip, FAQ-style notes and the .ics description. Plain text; `cost` says the workshop is free, that interpretation has some expenses and that contributions are welcome |
| `event.registration` | `required: true` + `url` shows a *Register* button; otherwise the `note` shows ("No pre-registration is required.") |
| `event.interpretation` | one item per language, Spanish first like the flyer (`key` `es`, then `asl`), each with `label`, `labelEs`, `note`, `noteEs` → the badges, the Zoom card and the poster line (`note`/`noteEs` are short how-to reminders kept with the data; the pages use the fuller how-to in `copy.json → accessibility` and `i18n.json → join.interpretation`). Pages look items up by `key`, so the order only sets the display order |
| `event.zoom.*` | meeting ID, passcode, join link, dial-in numbers → Zoom card, poster, **QR code**, .ics, JSON-LD, the `{zoomId}`/`{passcode}` tokens. Easier: Actions → *Update Zoom info*. The printed flyer does **not** follow (see *The official flyer*) |
| `event.calendarSequence` | bumped automatically when Zoom details change; bump it by hand if you change the date or time. Re-importing the calendar file `/aatapestry-workshop.ics` (fixed UID + this sequence) can then update the existing entry. On English pages the *Add to calendar* button's Apple/iCal option hands out that same file; on Spanish pages it makes a Spanish file with its own fixed UID (and this sequence), so it updates only an entry added from a Spanish page. Google, Outlook.com, Microsoft 365 and Yahoo links always add a new entry, so the site asks people to delete the old entry first |
| `flyer` | the official flyer's files, display size and the Zoom details it prints, `zoomMeetingId`, `zoomPasscode`, `zoomJoinUrl` (see *The official flyer* below) |
| `legacies[]` | the three legacies' names, colours and blurbs (`blurbEs` on `/es/`; colours also live in `src/assets/css/main.css`) |
| `contact.email` | the questions address printed on the flyer, **a44p69delegate@gmail.com**. **Each page prints the address at most once**: the *Questions* card (home, `/es/`, `/join/`, `/es/join/`, `/schedule/`), the flyer text (`/flyer/`, `/es/flyer/`), the printed line on the posters, the requests box on `/accessibility/`. Everywhere else (facts strip, contributions note, FAQ, updates, footer) it is a link labelled *Email the planning committee* / *Escribir al comité organizador* (`i18n.json → contact.linkText`). The calendar description ("Questions: …") and the JSON-LD `Organization` carry it too. Keep it filled in. `mailto:` subjects come from `i18n.json → en/es.contact` |
| `contact.icsOrganizer` | `false`: the .ics file has no ORGANIZER line, because Outlook would treat it as a meeting request from that address and some apps send RSVP replies to it. `true` adds the email as organizer |
| `github.owner` | enables the "Source code" footer link before the first deploy (CI fills it in automatically afterwards) |
| `disclaimer`, `copyrightNotice` | footer notices (Spanish versions live in `i18n.json → es.footer`) |

There is no lunch or doors-open field. Breaks, if the committee announces any, go in the program
(`schedule.json`).

## Times, the date, the email and Zoom numbers in prose: tokens

Never type them into the words files (`copy.json`, `faq.json`, `i18n.json`, `updates.json`,
`schedule.json`). Write a token instead; the build fills it in from `site.json` (through `when.js`)
everywhere — pages, feed, calendar file, search-engine data — so a change in `site.json` reaches all
the prose at once.

| Token | Becomes |
| --- | --- |
| `{email}` | the contact email. In prose use it only inside a link, `[email the planning committee](mailto:{email})` / `[escribir al comité organizador](mailto:{email})`: a bare `{email}` prints the address, and every page already prints it once (the Questions card, the flyer text or the poster line). The build warns ("[email] … printed more than once") if a page shows it twice |
| `{date}` · `{dateEs}` | the date, e.g. "Saturday, December 12, 2026" · "sábado 12 de diciembre de 2026" |
| `{time}` · `{timeEs}` | the time range, Eastern first, e.g. "11:00 AM – 7:00 PM ET" |
| `{timeLong}` · `{timeLongEs}` | the same with the zone spelled out ("Eastern Time" · "hora del Este") |
| `{startsAlso}` · `{startsAlsoEs}` | the start in the other zones: "8:00 AM PT · 9:00 AM MT · 10:00 AM CT" |
| `{rangesAlso}` · `{rangesAlsoEs}` | the whole range in PT, MT and CT |
| `{start}` · `{startEs}` | the start with its zone, "11:00 AM ET" · "11:00 a. m. ET" (the flyer's "Starting at 11am ET") |
| `{zoomId}` · `{passcode}` | the Zoom meeting ID and passcode |

A `{…}` that shows up literally on the live site is a bug: the template is missing the `tokens` filter.
Times come out with no-break spaces inside them ("11:00 a. m.", "7:00 PM ET"), so a phone never splits a time across
two lines; the calendar file and the social cards use ordinary spaces.
The plain-text fields in `site.json` (`description`, `metaDescription`, `event.cost`) are written out
in full, and so is the flyer image, so check those by hand whenever a fact changes.

## The program: `schedule.json`

- `status`: `pending` (now) shows what is announced — the start and end times and "the program will
  be available on this website shortly" — on the home page (*About the day*), `/es/` and `/schedule/`.
- When the committee sends the program, fill in `sessions` and set `status` to `published`. Each
  session has `start` and `end` (`HH:MM`, Eastern, i.e. the event timezone), `title`, `titleEs`,
  `summary`, `summaryEs`, `legacy` (`recovery` · `unity` · `service` · `all`, which colours the row)
  and `kind` (`opening` · `talk` · `session` · `break` · `closing`). Sessions show only when `status`
  is `published` and the list is not empty.
- Enter only what the committee has announced: no placeholder sessions, breaks or speakers.

## The weekly meeting: `meeting.json`

While `published` is `false`, nothing public mentions the meeting: `/meeting/` and its calendar file
are not built, and the *Meeting* menu link, the home-page teaser and the meeting cards on
`/principles/` and `/principles/N/` are hidden. Set `published: true`, then `weekday` (e.g.
`"tuesday"`), `time` (`"19:00"`), `zoom`, and `cycle.startDate` = the date of the meeting that studied
**number 1**. The meeting page then shows *this week's* number, the next twelve dates and a recurring
calendar file, and the menu gains a *Meeting* link. `cycle.mode` is `by-number` (12-week cycle, all
three legacies each week) or `by-principle` (36 weeks: Step 1, Tradition 1, Concept I, Step 2 …). The
Monday rebuild keeps it current.

## News: `updates.json`

Add an item at the top (`date`, `title`, `body`; the body accepts Markdown and tokens). It appears on
the home page and in `/feed.xml`. To correct an existing item, edit only its `body`: the feed id is
built from `date` + `title`, so changing either makes feed readers show it as a new item.

## Words: `copy.json`, `faq.json`, `i18n.json`

- `copy.json` — every English paragraph, heading and button label, grouped by section. The `_readme`
  says which fields accept simple Markdown (**bold**, links, lists); the rest are plain text.
- `faq.json` — the questions and answers: `id`, `q`, `a` (English, home page) and `qEs`, `aEs`
  (Spanish, `/es/`). Both are also published as `FAQPage` structured data.
- `i18n.json` — UI labels and the Spanish home, join, flyer and poster text. `en` and `es` must have
  exactly the same keys (use `""` where a language needs no text); this is checked at build time, and
  the build stops with the list of keys missing on either side.
- Spanish is natural Latin-American Spanish in an impersonal or "nosotros" register (never *tú*).

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
both marks. The site header and favicons use the primary mark's `plain` version (no words). CI
regenerates them for the deployed site but does not commit them: after changing `site.json` locally,
run `npm run build && npm run pdf` and commit `brand/` and `src/assets/img/og*.png`, so the copies in
the repository (QR codes, social cards, posters) match.

## The printable poster: `/poster/`, `/es/poster/`

A light-background, printer-friendly poster (Letter and A4) built from the data like every other page,
with both QR codes (Zoom, and the website: the English home page, or `/es/` on the Spanish poster). It is
the secondary printable next to the official flyer, and `/es/poster/` is the only Spanish one. `npm run pdf` (and CI) renders both to `brand/poster/` as PDF and PNG; it needs the
`#poster` element and the `.poster-*` classes on those pages, so keep them when editing the template.

## The official flyer: `brand/flyer/`

The committee's flyer is committed as supplied — it is **not generated**, and it carries its own
printed copy of the date, time, Zoom details and email:

| File | Used for |
| --- | --- |
| `incredible-tapestry-flyer.pdf` | *Download PDF* (print, Letter) |
| `incredible-tapestry-flyer.jpg` | *Print-quality image* (full page, 2550 × 3300, 300 dpi) |
| `incredible-tapestry-flyer-{600,1000,1600}.{jpg,webp}` | the picture on the pages: the artwork without its white margin, 600/1000/1600 px wide |

It is shown on `/flyer/` and `/es/flyer/` (with the full text of the flyer below it, in Spanish on the
Spanish page, since the flyer itself is in English) and on the home pages, and linked from the menu,
footer, FAQ and posters. `site.json → flyer` holds its paths, sizes and the Zoom details the flyer image
prints (`zoomMeetingId`, `zoomPasscode`, `zoomJoinUrl`). Whenever one of them differs from `event.zoom`
(for example after *Update Zoom info* or a passcode change picked up by *Sync Zoom*), every flyer
picture gets a note that its printed Zoom details are out of date
(`i18n.json → en/es.flyer.staleZoom`); the fix is a new flyer from the committee.

**To replace it with a new version:**

1. Keep the file names above, and replace all eight files together.
2. **Strip personal names from the PDF's metadata** before committing it. Design programs write the
   designer's name into the Author/Creator fields and the XMP block; for anonymity, the committed PDF
   should name only the committee.
3. Export the full page at 300 dpi as the `.jpg`, then crop the artwork (trim the white margin) and
   save it 600, 1000 and 1600 px wide, as JPG and WebP.
4. In `site.json → flyer`, set `width`/`height` to the pixel size of the 1000-px crop (now
   1000 × 1343; they reserve the space so the page does not jump while loading), update `pdfSize` and
   `jpgSize` to the real file sizes (`i18n.json → en/es.flyer.fileNote` reads them through the `{pdfSize}`
   and `{jpgSize}` tokens), and set `zoomMeetingId`, `zoomPasscode`
   and `zoomJoinUrl` to the Zoom details the new flyer prints.
5. Compare the flyer text on `/flyer/` (`i18n.json → en/es.flyer.text`) with the new flyer, then push.

Steps 2 and 3 in one go, with Python (`pip install pymupdf pillow`; run from the repository root with
the committee's file saved as `new-flyer.pdf`):

```python
import fitz
from PIL import Image, ImageChops

out = "brand/flyer/incredible-tapestry-flyer"
doc = fitz.open("new-flyer.pdf")
doc.set_metadata({"title": "The Incredible Tapestry (flyer)",
                  "author": "The Incredible Tapestry Workshop Planning Committee",
                  "subject": "", "keywords": "", "creator": "", "producer": "",
                  "creationDate": "", "modDate": ""})
doc.del_xml_metadata()
doc.save(out + ".pdf", garbage=4, deflate=True, clean=True)

pix = doc[0].get_pixmap(dpi=300, alpha=False)
page = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
page.save(out + ".jpg", quality=90, optimize=True, progressive=True)

ink = ImageChops.difference(page, Image.new("RGB", page.size, "white")).convert("L")
art = page.crop(ink.point(lambda v: 255 if v > 18 else 0).getbbox())
for w in (600, 1000, 1600):
    img = art.resize((w, round(art.height * w / art.width)), Image.LANCZOS)
    img.save(f"{out}-{w}.jpg", quality=84, optimize=True, progressive=True)
    img.save(f"{out}-{w}.webp", quality=82, method=6)
    print(w, "x", img.height)   # the 1000 line gives flyer.width / flyer.height
```

The current flyer prints the time as ET, like the website (EST appears only in the zone table). If a
replacement flyer prints "EDT", that is a misprint (December is standard time): never copy "EDT" into
the site. Check a replacement's Zoom details and QR code the same way before publishing it.

## Design tokens

Colours, fonts and component styles are in `src/assets/css/main.css` (Tailwind v4 `@theme` block
and plain CSS components). Dark mode follows the visitor's system setting; the footer has a toggle.

## Checking your work

`npm start` serves the site at <http://localhost:8080> with live reload. `npm run build && npm test`
validates the HTML and every internal link. The *Build & Deploy* run on GitHub shows the same checks
and a summary of the Zoom details it published.
