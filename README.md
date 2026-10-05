# The Incredible Tapestry — aatapestry.org

**Weaving the Steps, Traditions & Concepts Together** — the website of a free, all-day online A.A.
workshop on **Saturday, December 12, 2026, 8 AM – 4 PM Pacific**, on Zoom with ASL and Spanish
interpretation. It also hosts the study pages for all **36 principles** (Step, Tradition and
Concept of each number, side by side) that the weekly *36 Principles* meeting will use.

Everything on the site — every page, the printable poster, the QR codes, the calendar invite, the
social cards and the search-engine data — is generated from **one data file**,
[`src/_data/site.json`](src/_data/site.json). Change the Zoom link there (or from a form in GitHub
Actions) and the whole site follows.

> **First time here?** Follow [docs/SETUP-GITHUB.md](docs/SETUP-GITHUB.md) (about 15 minutes:
> create the repository, push, turn on Pages, point the domain). To change text, dates or the
> schedule, see [docs/EDITING.md](docs/EDITING.md).

## What is in the box

| Page | What it does |
| --- | --- |
| `/` | Home: date/time with the visitor's local time, live countdown, Zoom card with copy buttons, add-to-calendar, the three legacies, the 36 numbers, schedule, how to join, accessibility, poster + QR codes, FAQ, updates |
| `/schedule/` | The program (framework now; flip one flag to publish the sessions) and the start time in every US zone |
| `/principles/` and `/principles/1/` … `/12/` | All 36 principles side by side; one page per number with the full texts, the thread connecting them, reflection questions and a printable handout |
| `/meeting/` | The weekly 36 Principles meeting: this week's focus (computed from the cycle), format, Zoom, next 12 dates, recurring calendar file |
| `/accessibility/` | ASL and Spanish interpretation, captions, Zoom instructions, etiquette and online anonymity |
| `/join/`, `/es/join/` | A short page to send people to: Zoom link, ID, passcode, how to pick an interpretation channel |
| `/poster/`, `/es/poster/` | Print-ready poster (Letter and A4) with both QR codes; PDF/PNG downloads |
| `/es/` | Spanish landing page with the essentials |
| `/aatapestry-workshop.ics`, `/36-principles-meeting.ics` | Calendar files (stable UID, SEQUENCE bumps when the Zoom link changes, so calendars update instead of duplicating) |
| `/feed.xml`, `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest` | Updates feed, SEO files, home-screen app manifest |

**SEO & sharing:** semantic HTML, canonical URLs, Open Graph + Twitter cards with generated images,
`hreflang` for the bilingual pages, and schema.org JSON-LD (`Event` with `VirtualLocation`,
`FAQPage`, `BreadcrumbList`, `Article`, `Organization`, `WebSite`).
**Accessibility:** skip link, keyboard-friendly menus, visible focus, 44 px touch targets, reduced-motion
and dark-mode support, `aria-live` countdown, print styles.

## Brand files for print

[`brand/`](brand/BRAND.md) holds two marks, each in every format a print shop or designer needs — SVG and
vector PDF, PNG from 256 to 4096 px (transparent, white and cream backgrounds), one-colour and reversed
versions, horizontal and stacked wordmarks with the type outlined — plus favicons, the QR codes, social
cards and the poster PDFs:

- **Primary** (`brand/logo/`): the A.A. circle-and-triangle with *Unity · Service · Recovery* on the three
  sides and a three-circle Venn diagram woven inside, one circle per legacy. Generated from geometry by
  `scripts/make-aa-mark.mjs` (`npm run brand:mark`); a `plain` version without the words serves favicons
  and the site header.
- **Alternate** (`brand/alt-weave/logo/`): three interlaced triangles with a soft Venn flare.

`npm run build:brand` regenerates every derived file for both.

## How it updates itself (GitHub Actions)

| Workflow | When | What |
| --- | --- | --- |
| **Build & Deploy** (`deploy.yml`) | every push to `main`; every Monday; daily in December; by hand | regenerates brand assets (QR codes follow the Zoom link), builds the site, renders the poster PDFs, validates HTML + links, deploys to GitHub Pages |
| **Update Zoom info** (`update-zoom.yml`) | by hand, from a form | writes the new meeting ID / passcode / link into `site.json`, commits, rebuilds, redeploys |
| **Sync Zoom** (`sync-zoom.yml`) | daily (optional) | if Zoom API secrets are set, pulls the current link/passcode from Zoom and redeploys when they changed |

The weekly rebuild is what keeps "this week's number" on the meeting page right without anyone
touching the site.

## Working locally

```bash
npm install
npm start          # http://localhost:8080 with live reload
npm run build      # brand assets + Tailwind + Eleventy → _site/
npm run pdf        # poster PDFs/PNGs from the built site (headless Chrome)
npm test           # HTML validation + internal link check on _site/
```

Node 20 or newer (`.nvmrc` says 22). No global installs.

## Project layout

```
src/_data/        site.json · schedule.json · meeting.json · principles.json · copy.json · faq.json · i18n.json · updates.json
                  when.js (all date/time math) · focus.js (meeting cycle) · nav.js · build.js
src/pages/        one template per page (Nunjucks) + sitemap / feed / manifest / .ics generators
src/_includes/    layouts, partials (head, header, footer, zoom card, countdown, share, JSON-LD), macros
src/assets/       css/main.css (Tailwind v4 design system) · js/app.js · img/
brand/            src/ (SVG masters) → generated logo/, favicon/, qr/, social/, poster/, BRAND.md
scripts/          build-brand.mjs · pdf.mjs · update-zoom.mjs · sync-zoom.mjs
.github/workflows deploy.yml · update-zoom.yml · sync-zoom.yml
docs/             SETUP-GITHUB.md · EDITING.md
```

## Open-source libraries used

[Eleventy](https://www.11ty.dev/) (static site generator) · [Tailwind CSS v4](https://tailwindcss.com/) ·
[Alpine.js](https://alpinejs.dev/) · [Lucide](https://lucide.dev/) icons · [Fraunces](https://github.com/undercasetype/Fraunces)
and [Inter](https://rsms.me/inter/) via [Fontsource](https://fontsource.org/) · [Luxon](https://moment.github.io/luxon/) ·
[node-qrcode](https://github.com/soldair/node-qrcode) · [Add to Calendar Button](https://add-to-calendar-button.com/) (source-available, Elastic License 2.0 — free for a site like this) ·
[ics](https://github.com/adamgibbons/ics) · [resvg-js](https://github.com/yisibl/resvg-js) · [pdfkit](https://pdfkit.org/) +
[svg-to-pdfkit](https://github.com/alafr/SVG-to-PDFKit) · [opentype.js](https://opentype.js.org/) · [wawoff2](https://github.com/fontello/wawoff2) ·
[png-to-ico](https://github.com/steambap/png-to-ico) · [Puppeteer](https://pptr.dev/) · [markdown-it](https://github.com/markdown-it/markdown-it) ·
[html-minifier-terser](https://github.com/terser/html-minifier-terser) · [html-validate](https://html-validate.org/) · [linkinator](https://github.com/JustinBeckwith/linkinator).
No third-party CDNs, fonts or analytics: everything is served from this site.

## A note on the Zoom link

The join link (with the embedded passcode) and the QR code are public on this site because the
committee chose an open meeting. If uninvited guests become a problem, the usual remedies are a
waiting room, "allow participants to join from the web client only", requiring a Zoom account, or a
registration link (`site.json → event.registration`) — the site will show a *Register* button instead
of the raw link as soon as `registration.required` is true and a URL is set.

## Licence

Code: MIT (see [LICENSE](LICENSE)). The Twelve Steps, Twelve Traditions and Twelve Concepts for World
Service are copyrighted by Alcoholics Anonymous World Services, Inc. The site ships with the official
wording **not** included: each principle page gives a plain-words gist and links to the text on
aa.org. The committee may paste the official short forms into `principles.json` from its own
literature (see [docs/EDITING.md](docs/EDITING.md)); the pages then show them with the A.A.W.S.
credit line. This website is maintained by A.A. members and is not affiliated with or endorsed by
A.A.W.S. or the General Service Office.
