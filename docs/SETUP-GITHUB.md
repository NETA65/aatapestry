# First-run setup: GitHub Pages + aatapestry.org

About 15 minutes. You need a free GitHub account and access to the DNS settings of **aatapestry.org**.

## 1. Create the repository

On github.com: **New repository** → name `aatapestry` → Public → *Create repository* (no README,
licence or .gitignore; this folder already has them).

## 2. Turn on GitHub Pages (deploy from Actions) — before the first push

Repository → **Settings → Pages** → *Build and deployment* → **Source: GitHub Actions**.
(The deploy workflow also tries to enable this itself on its first run, so if you push first it
will usually still work; if that first run is red, enable Pages here and press *Re-run all jobs*.)

## 3. Push the site

In this folder:

```bash
git remote add origin https://github.com/<your-user>/aatapestry.git
```

```bash
git push -u origin main
```

The push starts the **Build & Deploy** workflow (Actions tab, about 2–3 minutes). Until the domain is
connected (step 4) the interim `https://<your-user>.github.io/aatapestry/` address will look unstyled:
the site is built for the root of **aatapestry.org**, so its `/assets/...` links only resolve there.
That is expected; finish step 4.

Optional: put your GitHub user name in `src/_data/site.json → github.owner` so the footer's
"Source code" link works before the first CI build (CI fills it in automatically afterwards).

## 4. Point aatapestry.org at GitHub Pages

At your DNS provider (where you bought the domain), add:

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |
| CNAME | `www` | `<your-user>.github.io` |

Then **Settings → Pages → Custom domain**: type `aatapestry.org`, *Save*. The repository ships
`src/CNAME` with the domain, so the setting survives every deploy. Wait for the DNS check (minutes to
an hour), then tick **Enforce HTTPS**. `www.aatapestry.org` redirects to the bare domain automatically.

Recommended: in your *profile* **Settings → Pages → Verified domains**, verify `aatapestry.org` so
nobody else can claim it on GitHub.

## 5. Check the workflows

Actions tab → **Build & Deploy** should be green. It also runs every Monday morning and daily in
December. Two more workflows are available from the *Run workflow* button:

- **Update Zoom info** — a form for a new meeting ID / passcode / link. It commits the change and
  redeploys. Nothing to install.
- **Sync Zoom** — only useful if you want the site to *follow* the Zoom meeting automatically:
  1. <https://marketplace.zoom.us/> → Develop → Build App → **Server-to-Server OAuth**.
  2. Add scope `meeting:read:meeting` (or `meeting:read:admin`), activate the app.
  3. Repository → Settings → Secrets and variables → Actions → *New repository secret* three times:
     `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`.
  Without the secrets the workflow simply reports "skipped".

**Scheduled runs and quiet repositories.** GitHub pauses `schedule` triggers in a repository that has
had no commits for 60 days. The weekly build re-enables both scheduled workflows each time it runs,
and any edit you push resets the clock, so in practice this only matters if nothing at all happens
for two months. If GitHub emails that a scheduled workflow was disabled, open Actions → the workflow →
*Enable workflow*.

## 6. Search engines

- Google Search Console → *Add property* → Domain `aatapestry.org` → verify with the DNS TXT record
  it gives you → *Sitemaps* → submit `https://aatapestry.org/sitemap.xml`.
- Bing Webmaster Tools can import the Search Console property in one click.
- Test the structured data at <https://search.google.com/test/rich-results> with the home page URL
  (it should show *Event* and *FAQ*).
- Test the link preview at <https://www.opengraph.xyz/> or by pasting the URL into a chat app.

## 7. Day-to-day

See [EDITING.md](EDITING.md). Every change is a commit; every commit is a deploy; nothing else to do.

## Troubleshooting

- **The github.io address looks unstyled** → by design (see step 3); the site is built for
  aatapestry.org. Once the custom domain is connected everything loads.
- **Styles missing on aatapestry.org** → Settings → Pages → Source must be **GitHub Actions**, not
  "Deploy from a branch".
- **Custom domain check fails** → DNS has not propagated yet, or the `www` CNAME points to the wrong
  user. `dig aatapestry.org +short` should list the four A records.
- **First run failed at "Configure Pages"** → Pages was not enabled yet. Do step 2, then *Re-run all jobs*.
- **Build fails on `npm ci`** → `package-lock.json` must be committed (it is) and Node 20+ is used
  (`.nvmrc` → 22).
- **Poster PDF step is red** → the site still deploys (it is allowed to fail); the previous PDFs stay.
  Run `npm run pdf` locally and commit `brand/poster/` to refresh them.
