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
    ogImage: (data) => data.ogImage || (data.lang === "es" ? "/assets/img/og-es.png" : "/assets/img/og.png"),
  },
};
