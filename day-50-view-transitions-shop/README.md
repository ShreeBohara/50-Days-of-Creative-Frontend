# Day 50 — Wavelength Records: A View Transitions Micro-Site

A tiny four-page record shop — home, catalog, album detail, about — where navigating between **real HTML pages** morphs shared elements: click an album cover in the bin and it physically grows into the detail-page hero, the header stays bolted in place, and the tracklist drops in row by row. There is no SPA framework, no client-side router, and **no JavaScript at all** — the morphing is the browser's native cross-document **View Transitions API**, opted into with `@view-transition { navigation: auto }` in shared CSS. Each of the 8 albums is an inline-SVG sleeve (geometric shapes + gradients, no image files) hardcoded identically on the catalog and its detail page so `view-transition-name: cover-N` pairs up across documents. The root cross-fade is customized (old page sinks away, new page rises), the about panel wipes in like a record sliding from its sleeve, and per-row `::view-transition-new(t-N)` delays stagger the tracklist entrance. A "morphing enabled" sticker renders through `@supports (view-transition-class: …)` alone, `prefers-reduced-motion` turns navigation transitions off with one nested at-rule, and in browsers without support the shop is exactly what it pretends to be: a fast, classic multi-page site.

**Live demo:** https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-50-view-transitions-shop/

## Tech

Plain HTML + CSS only (`@view-transition`, `view-transition-name` / `view-transition-class`, `::view-transition-old/new/group`, `@supports`, `prefers-reduced-motion`), Bricolage Grotesque + Space Mono (self-hosted woff2, SIL OFL)

## One Thing Learned

Cross-document view transitions have no JavaScript hook to pass state between pages, so *the CSS selector is the API*: the outgoing and incoming pages agree on nothing except that some element on each carries the same `view-transition-name`. That inverts the usual instinct to deduplicate — the "wasteful" hardcoding of each SVG sleeve on two pages is precisely what makes the morph seamless, because the browser only matches names, never content. And since names must be unique per page, a catalog of 8 covers can't share one `cover` name — it needs `cover-1..8`, while `view-transition-class` exists to style all eight groups' timing with a single rule.
