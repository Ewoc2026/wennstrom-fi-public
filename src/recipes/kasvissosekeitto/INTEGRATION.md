# Vegetable soup integration

Codex prepared this local website adaptation from the supplied v0.3.4 release
archive. The release's original documentation is retained as historical context;
it does not authorize deployment. No license has been selected on the user's behalf.

The source archive SHA-256 is
`00baf6a626b3f2cb1e572b02273edd295cd7b1514a7ab1e1cd052246a7921d88`.
The model, page template and CSS are unchanged. The only application change is
in `exportHtml`: a saved personal HTML file omits website navigation and canonical
and sitemap links. The recipe, state serialization and calculation are unchanged.

`src/pages/keittio/kasvissosekeitto.astro` imports the generated `index.html` as
trusted build-time text and retains its inline stylesheet and scripts. Its body
is placed inside the shared `PageLayout`; an optional head slot and HTML class
keep the application's stylesheet and no-JavaScript fallback intact. The wrapper
adds kitchen navigation and a factual Codex contribution statement.

This is one application implementation. The standalone file and the website
both use the same generated release artifact. Do not hand-edit `index.html`.
After changing application sources, regenerate and check it from the site root:

```sh
python3 src/recipes/kasvissosekeitto/build.py
node src/recipes/kasvissosekeitto/tests/model.test.js
npm run build
```

The Python build helper uses Node and Python's standard library. It is a local
authoring step; the existing deployment build continues to consume the committed
artifact without a new Python dependency. The nested `package.json` preserves
the release's CommonJS model/test semantics inside the ESM Astro project.

Browser verification must cover the built website and an exported file opened
offline, including notes, custom quantities, clipboard fallback and printing.
The supplied Python tests require Playwright and a Chromium executable; their
original launch paths may need an explicitly recorded local test adapter.

For CSP checks, compute hashes from the actual built HTML, not a previous release.
`csp_hashes.py` is an application-only example, not a site-wide configuration.
No hosting policy or global security setting is changed by this integration.

Source files, tests and this note are outside `public/` and are not copied into
the deployed site. Pushing them to the public Git repository would nevertheless
publish them, and requires the user's explicit approval.
