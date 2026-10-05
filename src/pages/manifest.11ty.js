// Web app manifest (so the site can be pinned to a phone's home screen).
export default class {
  data() {
    return { permalink: "/manifest.webmanifest", eleventyExcludeFromCollections: true, layout: false };
  }
  render({ site }) {
    return JSON.stringify(
      {
        name: site.name,
        short_name: site.shortName,
        description: site.description,
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
          { name: "Join on Zoom", url: "/join/", icons: [{ src: "/brand/favicon/icon-192.png", sizes: "192x192" }] },
          { name: "The 36 principles", url: "/principles/" },
        ],
      },
      null,
      2,
    );
  }
}
