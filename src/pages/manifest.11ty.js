// Web app manifest (so the site can be pinned to a phone's home screen). The description is
// site.json → description (plain text; any {tokens} in it are filled in all the same).
import { applyTokens } from "../../scripts/lib/tokens.mjs";

export default class {
  data() {
    return { permalink: "/manifest.webmanifest", eleventyExcludeFromCollections: true, layout: false };
  }
  render({ site, when }) {
    return JSON.stringify(
      {
        name: site.name,
        short_name: site.shortName,
        description: applyTokens(site.description, { site, when }),
        start_url: "/",
        scope: "/",
        display: "standalone",
        lang: site.lang,
        background_color: site.backgroundColor,
        theme_color: site.themeColor,
        icons: [
          { src: "/brand/favicon/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/brand/favicon/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/brand/favicon/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          { name: "How to join", url: "/join/", icons: [{ src: "/brand/favicon/icon-192.png", sizes: "192x192" }] },
          { name: "The official flyer", url: "/flyer/" },
          { name: "The 36 principles", url: "/principles/" },
        ],
      },
      null,
      2,
    );
  }
}
