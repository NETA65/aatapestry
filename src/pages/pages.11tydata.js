// Defaults for every page in src/pages. `t` is the UI dictionary for the page's language
// (i18n.json), so templates write {{ t.labels.joinZoom }} and the same template renders in
// English or Spanish.
export default {
  layout: "layouts/base.njk",
  lang: "en",
  translated: false,
  eleventyComputed: {
    t: (data) => (data.i18n && (data.i18n[data.lang] || data.i18n.en)) || {},
    otherLang: (data) => (data.lang === "es" ? "en" : "es"),
    // The ?v= query makes Facebook, WhatsApp, Slack… fetch the flyer-style cards instead of a cached older one;
    // bump it whenever scripts/make-og.mjs output changes.
    ogImage: (data) => data.ogImage || (data.lang === "es" ? "/assets/img/og-es.png?v=2" : "/assets/img/og.png?v=2"),
  },
};
