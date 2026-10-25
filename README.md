# The Incredible Tapestry — aatapestry.org

**Weaving the Steps, Traditions & Concepts Together** — the website of a free, 1-day online A.A.
workshop on **Saturday, December 12, 2026, 11 AM – 7 PM Eastern (8 AM PT · 9 AM MT · 10 AM CT)**,
on Zoom with Spanish and ASL interpretation, similar to the Tapestry meetings held previously in
Raynham, Massachusetts. No pre-registration; contributions toward the interpretation costs are
welcome. Questions: **a44p69delegate@gmail.com**. The site also hosts study pages for all
**36 principles** (Step, Tradition and Concept of each number, side by side).

Everything on the site — every page, the printable poster, the QR codes, the calendar invite, the
social cards and the search-engine data — is generated from **one data file**,
[`src/_data/site.json`](src/_data/site.json). Change the Zoom link there (or from a form in GitHub
Actions) and the whole site follows. The one exception is the committee's **official flyer** in
[`brand/flyer/`](brand/flyer/): it is a finished PDF/JPG with the date, time, Zoom details and email
printed on it, so it is replaced by hand (same file names) — see
[docs/EDITING.md](docs/EDITING.md#the-official-flyer-brandflyer).

> **First time here?** Follow [docs/SETUP-GITHUB.md](docs/SETUP-GITHUB.md) (about 15 minutes:
> create the repository, push, turn on Pages, point the domain). To change text, dates, the
> program or the flyer, see [docs/EDITING.md](docs/EDITING.md).

## What is in the box

| Page | What it does |
| --- | --- |
| `/` | Home: date and time (Eastern first, then PT/MT/CT and the visitor's local time), live countdown, Zoom card with copy buttons, add-to-calendar, about the day (program coming soon), how to join, Spanish/ASL interpretation, the official flyer, questions email + FAQ, Seventh Tradition, the three legacies, the 36 numbers, updates |
| `/schedule/` | *Program* in the menu (English only): the day's times in every US zone, Puerto Rico, Mexico City and UTC, and the program once the committee publishes it (`schedule.json → status`); until then a "coming soon" note |
| `/principles/` and `/principles/1/` … `/12/` | All 36 principles side by side; one page per number with a summary of the Step, Tradition and Concept and links to their texts at aa.org (the texts themselves only if the committee pastes them into `principles.json`), the thread connecting them, reflection questions and a printable handout |
| `/meeting/` | Optional weekly *36 Principles* meeting page — **not built**, and not mentioned or linked anywhere, while `meeting.json → published` is `false` |
| `/accessibility/` | Spanish and ASL interpretation and how to use them in Zoom, captions (if they are turned on), general Zoom tips, etiquette and online anonymity |
| `/join/`, `/es/join/` | A short page to send people to: Zoom link, ID, passcode, how to pick an interpretation channel, questions email |
| `/flyer/`, `/es/flyer/` | The committee's official flyer (in English) with PDF and print-quality JPG downloads and the full text of the flyer on the page (in Spanish on `/es/flyer/`) |
| `/poster/`, `/es/poster/` | Printer-friendly poster (light background, Letter and A4) with both QR codes; PDF/PNG downloads. `/es/poster/` is the only Spanish printable |
| `/es/` | Spanish home page with the essentials |
| `/aatapestry-workshop.ics` (and `/36-principles-meeting.ics` once the meeting is published) | Calendar file: stable UID, and SEQUENCE bumps when the Zoom details change, so re-adding it updates the entry instead of duplicating it. No ORGANIZER; the questions email is in the description |
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
cards, the printable poster PDFs and the committee's official flyer:

- **Primary** (`brand/logo/`): the A.A. circle-and-triangle with *Unity · Service · Recovery* on the three
  sides and a three-circle Venn diagram woven inside, one circle per legacy. Generated from geometry by
  `scripts/make-aa-mark.mjs` (`npm run brand:mark`); a `plain` version without the words serves favicons
  and the site header.
- **Alternate** (`brand/alt-weave/logo/`): three interlaced triangles with a soft Venn flare.
- **Official flyer** (`brand/flyer/`): the committee's flyer as PDF (print, Letter) and JPG (full page,
  300 dpi), plus the artwork cropped for the web at 600/1000/1600 px (JPG + WebP). **Not generated**:
  replace it by hand, keeping the file names.

`npm run build:brand` regenerates every derived file for both marks (never the flyer).

## How it updates itself (GitHub Actions)

| Workflow | When | What |
| --- | --- | --- |
| **Build & Deploy** (`deploy.yml`) | every push to `main`; every Monday; daily in December; by hand | regenerates brand assets (QR codes follow the Zoom link), builds the site, renders the printable poster PDFs (English and Spanish), validates HTML + links, deploys to GitHub Pages |
| **Update Zoom info** (`update-zoom.yml`) | by hand, from a form | writes the new meeting ID / passcode / link into `site.json`, commits, rebuilds, redeploys |
| **Sync Zoom** (`sync-zoom.yml`) | daily (optional) | if Zoom API secrets are set, pulls the current link/passcode from Zoom and redeploys when they changed |

The scheduled rebuilds keep the countdown fallback and the "updated" dates current without anyone
touching the site (and "this week's number", if the meeting page is ever published). CI regenerates
the brand files for the deployed site but does not commit them back; after a local data change, run
`npm run build` (and `npm run pdf`) and commit `brand/` and `src/assets/img/og*.png`.

## Working locally

```bash
npm install
npm start          # http://localhost:8080 with live reload
npm run build      # brand assets + Tailwind + Eleventy → _site/
npm run pdf        # printable poster PDFs/PNGs (EN + ES) from the built site (headless Chrome)
npm test           # HTML validation + internal link check on _site/
```

Node 20 or newer (`.nvmrc` says 22). No global installs.

## Project layout

```
src/_data/        site.json · schedule.json · meeting.json · principles.json · copy.json · faq.json · i18n.json · updates.json
                  when.js (all date/time math) · focus.js (meeting cycle) · nav.js · build.js
src/pages/        one template per page (Nunjucks) + sitemap / feed / manifest / .ics generators
src/_includes/    layouts, partials (head, header, footer, zoom card, countdown, share, flyer picture, questions card, JSON-LD), macros
src/assets/       css/main.css (Tailwind v4 design system) · js/app.js · img/
brand/            src/ (SVG masters) → generated logo/, alt-weave/, favicon/, qr/, social/, poster/, BRAND.md
                  flyer/ (the official flyer, supplied by the committee — not generated)
scripts/          make-aa-mark.mjs · build-brand.mjs · pdf.mjs · update-zoom.mjs · sync-zoom.mjs · lib/
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

## Questions and contact

Questions about the workshop go to **a44p69delegate@gmail.com**, the address printed on the flyer. It
lives in `site.json → contact.email`. Each page prints the address **once**: the *Questions* card (home,
`/es/`, the join and program pages), the flyer text on `/flyer/`, the printed line on the posters, or the
requests box on `/accessibility/`. Everywhere else (facts strip, contributions note, FAQ, footer) it is a
link labelled *Email the planning committee* / *Escribir al comité organizador*; in prose, write
`[email the planning committee](mailto:{email})`, never a bare `{email}`. The calendar entry's
description and the JSON-LD carry the address too. Contributions toward the interpretation costs are welcome; no payment method is
published, so people are pointed to the same address.

## Licence

Code: MIT (see [LICENSE](LICENSE)). The Twelve Steps, Twelve Traditions and Twelve Concepts for World
Service are copyrighted by Alcoholics Anonymous World Services, Inc. The site ships with the official
wording **not** included: each principle page gives a plain-words gist and links to the text on
aa.org. The committee may paste the official short forms into `principles.json` from its own
literature (see [docs/EDITING.md](docs/EDITING.md)); the pages then show them with the A.A.W.S.
credit line. This website is maintained by A.A. members and is not affiliated with or endorsed by
A.A.W.S. or the General Service Office.
