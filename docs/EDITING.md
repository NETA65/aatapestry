# Editing the site

Everything is data. You never edit HTML. Change a value in one of the files in `src/_data/`, push to
`main` (or edit the file on github.com and press *Commit*), and GitHub rebuilds the site in about two
minutes. Each JSON file has a `_readme` field at the top that explains it.

The workshop: **Saturday, December 12, 2026, 11:00 AM – 7:00 PM Eastern (ET)** = 8:00 AM PT ·
9:00 AM MT · 10:00 AM CT, on Zoom, with Spanish and ASL interpretation. Free; contributions welcome;
no pre-registration. Questions: a44p69delegate@gmail.com. The site always leads with Eastern time.

## Where things live

| To change… | Edit |
| --- | --- |
| the date, times, Zoom details, email, interpretation, legacies | `src/_data/site.json` (the facts — see below) |
| the program | `src/_data/schedule.json` |
| words on one page | that page's file in `src/_data/pagecopy/` (`home.json`, `program.json`, `join.json`, `flyer.json`, `poster.json`, `faq.json`) — each has an `en` and an `es` half |
| menu labels, buttons, footer, the notice about the Zoom link, other shared words | `src/_data/i18n.json` (`en` and `es`) |
| the questions and answers | `src/_data/faq.json` |
| the study pages (/principles/) | `src/_data/principles.json` and `src/_data/copy.json` |
| the menu itself (which pages, in which order) | `src/_data/nav.js` |

**English and Spanish must have the same keys** in `i18n.json` and in every `pagecopy/*.json` file.
The build checks this and stops with a list of the keys missing on either side (use `""` where one
language needs no text). Spanish is natural Latin-American Spanish, *usted* form (never *tú*).

**One fact, one page.** The site was designed so each piece of information lives on one page and the
others link to it: the Zoom details and how-to on *How to join*, the times in every zone and *Add to
calendar* on *Program*, the flyer and posters on *Flyer*, cost and contributions in the *FAQ*. Please
keep it that way: if a page needs to mention something another page owns, write one short line and
link to it.

## The one file you will touch most: `src/_data/site.json`

| Field | What it changes |
| --- | --- |
| `name`, `shortName`, `title`, `tagline`, `hook` | the site name, browser titles, wordmark text, social cards. `name` and `tagline` are also drawn into the logo wordmark files in `brand/logo/` |
| `subtitle` | the flyer's sub-line on the social cards. On the pages it comes from `i18n.json → en/es.landing.subline` |
| `description`, `metaDescription` | the default meta description, the `Event` description for search engines and the app manifest. **Plain text with the time written out**: update them by hand if the date or time changes |
| `url`, `domain` | canonical links, sitemap, QR code for the site, poster |
| `event.date`, `event.start`, `event.end`, `event.timezone` | **every** date and time on the site, the countdown, the time bar, the time-zone table, the .ics file, JSON-LD, the poster and social cards, and the tokens (below). 24-hour `HH:MM` in the given IANA timezone; now `2026-12-12`, `11:00`–`19:00`, `America/New_York` |
| `event.timezoneShort`, `event.timezoneLabel`, `event.timezoneLabelEs` | `ET`, `Eastern Time`, `hora del Este`. Typed, not computed: change them together with `event.timezone`. Never "EDT": December is standard time |
| `event.status` | `scheduled` · `postponed` · `cancelled` — the schema.org and .ics status |
| `event.announced` | the date the workshop was first announced (search-engine data) |
| `event.cost`, `event.audience` | the .ics description and search-engine data (plain text) |
| `event.interpretation` | Spanish (`es`) and ASL (`asl`) labels used by the poster and flyer text |
| `event.zoom.*` | meeting ID, passcode, join link, dial-in numbers → every Join button, the Zoom details on the home page and *How to join*, the poster, the **QR code**, the .ics file, the calendar links, JSON-LD, the `{zoomId}`/`{passcode}` tokens. Easier: Actions → *Update Zoom info*. The printed flyer does **not** follow (see *The official flyer*) |
| `event.calendarSequence` | bumped automatically when Zoom details change; bump it by hand if you change the date or time, so re-importing `/aatapestry-workshop.ics` updates an existing entry. Google, Outlook.com, Microsoft 365 and Yahoo links always add a new entry, so the site asks people to delete the old one first |
| `flyer` | the official flyer's files, display size and the Zoom details it prints (see *The official flyer*) |
| `legacies[]` | the three legacies' names, colours and blurbs (the colours also live in `src/assets/css/main.css`) |
| `contact.email` | the questions address printed on the flyer. **Every page prints it once**, in the purple band at the top of the footer, with a copy button (the printable poster prints it too). Everywhere else it is a link labelled *Email the planning committee* / *Escribir al comité organizador* (`i18n.json → contact.linkText`); in prose write `[email the planning committee](mailto:{email})`. The build warns if a page prints it twice |
| `contact.icsOrganizer` | `false`: no ORGANIZER line in the .ics file (Outlook would treat it as a meeting request) |
| `disclaimer`, `copyrightNotice` | kept for reference; the footer notices are in `i18n.json → en/es.footer` |

## Dates, times, the email and Zoom numbers in prose: tokens

Never type them into the words files (`i18n.json`, `pagecopy/*.json`, `copy.json`, `faq.json`,
`schedule.json`). Write a token; the build fills it in from `site.json` (through `when.js`)
everywhere, so a change in `site.json` reaches all the prose at once.

| Token | Becomes |
| --- | --- |
| `{email}` | the contact email — only inside a link: `[email the planning committee](mailto:{email})` |
| `{date}` · `{dateEs}` | "Saturday, December 12, 2026" · "sábado 12 de diciembre de 2026" |
| `{time}` · `{timeEs}` | "11:00 AM – 7:00 PM ET" · "11:00 a. m. – 7:00 p. m. ET" |
| `{timeShort}` · `{timeShortEs}` | "11 AM – 7 PM ET" |
| `{timeLong}` · `{timeLongEs}` | the range with the zone spelled out ("Eastern Time" · "hora del Este") |
| `{startsAlso}` · `{startsAlsoEs}` | "8:00 AM PT · 9:00 AM MT · 10:00 AM CT" |
| `{rangesAlso}` · `{rangesAlsoEs}` | the whole range in PT, MT and CT |
| `{start}` · `{startEs}` | "11:00 AM ET" · "11:00 a. m. ET" |
| `{zoomId}` · `{passcode}` · `{joinUrl}` | the Zoom meeting ID, passcode and link |
| `{domain}` · `{url}` · `{pdfSize}` · `{jpgSize}` | aatapestry.org, its URL, the flyer's file sizes |

A `{…}` that shows up literally on the live site is a bug (the build also warns). The countdown's
placeholders are written `%n`, `%h`, `%m`, `%start` (`i18n.json → countdown`) because braces are
token syntax. The plain-text fields in `site.json` (`description`, `metaDescription`, `event.cost`)
and the flyer image are written out in full, so check those by hand whenever a fact changes.

## The program: `schedule.json`

- `status: "pending"` (now): *Program* shows the announced frame — the start and end times and "the
  program will be available on this website shortly".
- When the committee sends the program, fill in `sessions` and set `status` to `"published"`. Each
  session has `start` and `end` (`HH:MM`, Eastern), `title`, `titleEs`, `summary`, `summaryEs`,
  `legacy` (`recovery` · `unity` · `service` · `all`, which colours the row) and `kind` (`opening` ·
  `talk` · `session` · `break` · `closing`). Enter only what the committee has announced.

## The notice about the Zoom link

`i18n.json → en/es.notice` is the short notice shown on the home page and on *How to join* (now: the
Zoom link changed on October 25). Set both `text` values to `""` to remove it.

## The questions and answers: `faq.json`

Each item has `id` (never reuse or rename one — pages link to `#faq-<id>`, e.g. `#faq-cost`), `group`
(the heading it sits under; the group names are in `pagecopy/faq.json`), `q` and `a` (English) and
`qEs` and `aEs` (Spanish). Answers accept simple Markdown and tokens, and stay to one to three
sentences, linking to the page that owns the details. They are also published as `FAQPage` data for
search engines.

## The 36 principles: `principles.json` and `copy.json`

One entry per number with `step`, `tradition`, `concept` and `thread` (title, one-liner, summary,
"how it weaves", three questions). Each of the three has a one-word `principle`, a short `gist` in our
own words, `keywords`, and a `text` field that ships **empty**: the pages then show the gist and a
"Read Step N at aa.org" link. To show the official short-form wording instead, paste it into `text`
from your own A.A. literature and keep the A.A.W.S. credit line in `notice`; the pages and the footer
credit switch automatically. The introductory text of `/principles/` is in `copy.json` (`intro`,
`legacies`, `thirtySix`, `logoStory`).

## The official flyer: `brand/flyer/`

The committee's flyer is committed as supplied — **not generated** — and carries its own printed copy
of the date, time, Zoom details and email:

| File | Used for |
| --- | --- |
| `incredible-tapestry-flyer.pdf` | *Download PDF* (print, Letter) |
| `incredible-tapestry-flyer.jpg` | the print-quality image (full page, 2550 × 3300, 300 dpi) |
| `incredible-tapestry-flyer-{600,1000,1600}.{jpg,webp}` | the picture on the pages (the artwork without its white margin) |

`site.json → flyer` holds its paths, sizes and the Zoom details the flyer image prints
(`zoomMeetingId`, `zoomPasscode`, `zoomJoinUrl`). Whenever one of them differs from `event.zoom`, the
flyer page warns that the flyer's printed Zoom details are out of date; the fix is a new flyer.

**To replace it with a new version:**

1. Keep the file names above, and replace all eight files together.
2. **Strip personal names from the PDF's metadata** (designers' names end up in Author/Creator/XMP).
3. Export the full page at 300 dpi as the `.jpg`, then crop the artwork (trim the white margin) and
   save it 600, 1000 and 1600 px wide, as JPG and WebP.
4. In `site.json → flyer`, set `width`/`height` to the pixel size of the 1000-px crop, update
   `pdfSize`/`jpgSize`, and set the three `zoom*` fields to what the new flyer prints.
5. Compare the flyer's text on `/flyer/` (`pagecopy/flyer.json`) with the new flyer, then push.

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

## The printable poster: `/poster/`, `/es/poster/`

A light-background, printer-friendly poster (Letter and A4) built from the data, with QR codes for
Zoom and the website. `npm run pdf` (and CI on every deploy) renders both to `brand/poster/` as PDF and
PNG; it relies on the `#poster` element on those pages, so keep it when editing the template.

## The logo and brand files

`brand/` keeps two marks with complete file sets for print (see `brand/BRAND.md`); it is generated by
`npm run brand:mark` and `npm run build:brand`. The website's logo, `src/assets/img/logo.svg` (and
`logo-plain.svg` for the header and footer), is the primary mark recoloured the way the flyer shows
it, on a dark disc; `npm run brand:site` derives it from `brand/src/mark.svg`.

## Design

Colours, fonts and components are in `src/assets/css/main.css` (Tailwind v4 `@theme` tokens and
components); each page's own rules are in `src/assets/css/pages/`. The palette comes from the flyer:
navy, gold, cream, and the legacy colours (Recovery blue, Unity green, Service gold). The title
lettering uses Playfair Display (*THE INCREDIBLE*) and Great Vibes (*Tapestry*); headings use
Fraunces and text uses Inter. Dark mode follows the visitor's system setting.

## Checking your work

`npm start` serves the site at <http://localhost:8080> with live reload. Before pushing a bigger change:

```bash
npm run build
npm test           # HTML validation + every internal link
npm run test:ui    # every page at 320–1440 px, light and dark: no overflow, no accessibility violations
```

The *Build & Deploy* run on GitHub runs the same checks.
