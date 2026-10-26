# The Incredible Tapestry — aatapestry.org

The website of **The Incredible Tapestry**, a free, 1-day online A.A. workshop on **Saturday,
December 12, 2026, 11 AM – 7 PM Eastern (8 AM PT · 9 AM MT · 10 AM CT)**, on Zoom with Spanish and
ASL interpretation, similar to the Tapestry meetings held previously in Raynham, Massachusetts. No
pre-registration; contributions toward the interpretation costs are welcome. Questions:
**a44p69delegate@gmail.com**. The site also hosts study pages for all **36 principles** (the Step,
Tradition and Concept of each number, side by side).

The design follows the committee's official flyer: the circle-and-triangle logo on a dark disc, the
gold *THE INCREDIBLE* over a script *Tapestry*, deep navy with the bright thread colours of the three
legacies. It works on every screen size from 320 px phones up, in light and dark mode, in English
and Spanish. A sun button in the header gives the whole site a lighter background, the navy flyer
surfaces included (styled like the printable poster); the browser remembers the choice.

Everything on the site — every page, the printable poster, the QR codes, the calendar file, the
social cards and the search-engine data — is generated from **one data file**,
[`src/_data/site.json`](src/_data/site.json). Change the Zoom link there (or from a form in GitHub
Actions) and the whole site follows. The one exception is the committee's **official flyer** in
[`brand/flyer/`](brand/flyer/), a finished PDF/JPG replaced by hand (same file names) — see
[docs/EDITING.md](docs/EDITING.md#the-official-flyer-brandflyer).

> **First time here?** Follow [docs/SETUP-GITHUB.md](docs/SETUP-GITHUB.md) (create the repository,
> push, turn on Pages, point the domain). To change text, dates, the program or the flyer, see
> [docs/EDITING.md](docs/EDITING.md).

## Site map

Each piece of information lives on exactly one page; the others link to it.

| English | Spanish | What it holds |
| --- | --- | --- |
| `/` | `/es/` | The flyer as a web page: logo, title, date, time bar (ET, then PT · MT · CT and the visitor's own time), *Join on Zoom*, *Add to calendar*, countdown; the three essentials (Zoom, interpretation, cost); what the day is; the flyer to share |
| `/program/` | `/es/program/` | The day's timeline (the program once the committee publishes it), the time in every US zone, Puerto Rico, Mexico City, London, India, Sydney and UTC, *Add to calendar* |
| `/join/` | `/es/join/` | Zoom link, meeting ID and passcode with copy buttons, QR code, step-by-step joining, Spanish/ASL interpretation and captions (`#interpretation`), Zoom etiquette and online anonymity (`#etiquette`), accessibility (`#accessibility`) |
| `/flyer/` | `/es/flyer/` | *Flyer & poster*: the official flyer with PDF/JPG downloads, sharing and the flyer's text (`#official-flyer`, `#flyer-text`); the printer-friendly poster (light background, Letter and A4, QR codes) with print, PDF/PNG downloads and a preview (`#printable-poster`). Printed, the page is the poster alone |
| `/faq/` | `/es/faq/` | Questions and answers, grouped, including cost and contributions (`#faq-cost`) |
| `/principles/`, `/principles/1/` … `/12/` | — | The 36 principles side by side, one page per number (English only) |
| `/aatapestry-workshop.ics` | `/es/aatapestry-workshop.ics` | Calendar file (same UID and SEQUENCE in both languages, so re-importing either updates one entry; SEQUENCE bumps when the Zoom details change) |

Old addresses forward to their new home: `/schedule/` → `/program/`, `/accessibility/` →
`/join/#interpretation`, `/meeting/` → `/principles/`, `/poster/` → `/flyer/#printable-poster` (and `/es/poster/` →
`/es/flyer/#printable-poster`), and links into sections of the old one-page home
(`/#join`, `/es/#unirse`, …) go to the page that now holds that section. Also generated: `/feed.xml` (the updates feed, Atom; entries in `site.json → updates`), `/sitemap.xml`, `/robots.txt`,
`/manifest.webmanifest`, `/404.html`.

The questions address is printed once on every page, in the purple band at the top of the footer
(with a copy button; the printable poster on `/flyer/` prints it too); everywhere else it is a link
labelled *Email the planning committee*.

**SEO & sharing:** canonical URLs, Open Graph and Twitter cards with flyer-style images, `hreflang`
for the bilingual pages, schema.org JSON-LD (`Event` with `VirtualLocation`, `FAQPage`,
`BreadcrumbList`, `Article`, `Organization`, `WebSite`).
**Accessibility:** WCAG 2.2 AA colour contrast in light and dark mode and with the lighter background, skip link, one `h1` per page,
keyboard-friendly menu and calendar menu, visible focus, 44 px touch targets, reduced-motion support,
print styles. Checked with axe-core and html-validate.

## Brand files

[`brand/`](brand/BRAND.md) holds the marks in every format a print shop needs (SVG, vector PDF, PNG up
to 4096 px, one-colour and reversed versions, wordmarks), plus favicons, QR codes, social cards, the
printable poster PDFs and the official flyer. The website uses only what it links to (flyer, favicons,
QR codes, social cards, posters); the rest is kept for print and later reuse.
The site's own logo, `src/assets/img/logo.svg` (the primary mark on the flyer's dark disc), is derived
from `brand/src/mark.svg` by `npm run brand:site`.

## How it updates itself (GitHub Actions)

| Workflow | When | What |
| --- | --- | --- |
| **Build & Deploy** (`deploy.yml`) | every push to `main`; every Monday; daily in December; by hand | regenerates brand assets (QR codes follow the Zoom link), builds the site, renders the printable poster PDFs (English and Spanish), validates HTML + links, deploys to GitHub Pages |
| **Update Zoom info** (`update-zoom.yml`) | by hand, from a form | writes the new meeting ID / passcode / link into `site.json`, commits, rebuilds, redeploys |
| **Sync Zoom** (`sync-zoom.yml`) | daily (optional) | if Zoom API secrets are set, pulls the current link/passcode from Zoom and redeploys when they changed |

## Working locally

```bash
npm install
npm start          # http://localhost:8080 with live reload
npm run build      # brand assets + site logo + Tailwind + Eleventy → _site/
npm run pdf        # printable poster PDFs/PNGs (EN + ES) from the built site (headless Chrome)
npm test           # HTML validation + internal link check on _site/
npm run test:ui    # responsive + accessibility check (axe-core) of every page in light and dark mode and with the lighter background
```

Node 20 or newer (`.nvmrc` says 22). No global installs.

## Project layout

```
src/_data/        site.json (the facts) · schedule.json (program) · principles.json · faq.json
                  i18n.json (shared interface strings, en + es) · pagecopy/<page>.json (each page's copy, en + es)
                  copy.json (study pages, 404, event summary) · when.js (all date/time math) · calendar.js · nav.js · build.js
src/pages/        one template per page; the bilingual pages render /x/ and /es/x/ from one file
src/_includes/    layouts/ · partials/ (head, header, footer, page hero, Zoom details, calendar menu, time bar…) · macros/
src/assets/       css/main.css (Tailwind v4 design system) + css/pages/*.css + css/theme-light.css (the lighter background) · js/app.js (no dependencies) · img/ · fonts (copied from @fontsource)
brand/            src/ (SVG masters) → generated logo/, alt-weave/, favicon/, qr/, social/, poster/, BRAND.md · flyer/ (official, not generated)
scripts/          make-aa-mark.mjs · make-site-logo.mjs · build-brand.mjs · pdf.mjs · update-zoom.mjs · sync-zoom.mjs · lib/
.github/workflows deploy.yml · update-zoom.yml · sync-zoom.yml
docs/             SETUP-GITHUB.md · EDITING.md
```

## Open-source libraries used

[Eleventy](https://www.11ty.dev/) · [Tailwind CSS v4](https://tailwindcss.com/) · [Lucide](https://lucide.dev/) icons ·
[Inter](https://rsms.me/inter/), [Fraunces](https://github.com/undercasetype/Fraunces), [Playfair Display](https://github.com/clauseggers/Playfair)
and [Great Vibes](https://fonts.google.com/specimen/Great+Vibes) via [Fontsource](https://fontsource.org/) (SIL Open Font License) ·
[Luxon](https://moment.github.io/luxon/) · [node-qrcode](https://github.com/soldair/node-qrcode) · [ics](https://github.com/adamgibbons/ics) ·
[resvg-js](https://github.com/yisibl/resvg-js) · [pdfkit](https://pdfkit.org/) + [svg-to-pdfkit](https://github.com/alafr/SVG-to-PDFKit) ·
[opentype.js](https://opentype.js.org/) · [wawoff2](https://github.com/fontello/wawoff2) · [png-to-ico](https://github.com/steambap/png-to-ico) ·
[Puppeteer](https://pptr.dev/) · [markdown-it](https://github.com/markdown-it/markdown-it) · [html-minifier-terser](https://github.com/terser/html-minifier-terser) ·
[html-validate](https://html-validate.org/) · [linkinator](https://github.com/JustinBeckwith/linkinator) · [axe-core](https://github.com/dequelabs/axe-core).
No third-party CDNs, fonts or analytics: everything is served from this site.

## A note on the Zoom link

The join link (with the embedded passcode) and the QR code are public on this site because the
committee chose an open meeting. If uninvited guests become a problem, the usual remedies are a
waiting room, "allow participants to join from the web client only", requiring a Zoom account, or a
registration link.

## Licence

Code: MIT (see [LICENSE](LICENSE)). The Twelve Steps, Twelve Traditions and Twelve Concepts for World
Service are copyrighted by Alcoholics Anonymous World Services, Inc. The site ships with the official
wording **not** included: each principle page gives a plain-words gist and links to the text on
aa.org (see [docs/EDITING.md](docs/EDITING.md)). This website is maintained by A.A. members and is not
affiliated with or endorsed by A.A.W.S. or the General Service Office.
