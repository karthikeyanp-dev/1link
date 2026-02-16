# 1Link Collections (PWA)

A no-login Progressive Web App to create bookmark collections, enrich links with previews, and export any collection as a standalone HTML page for sharing.

## Features

- Create, rename, and delete collections.
- Add links to each collection.
- Automatic link preview enrichment (best-effort via Microlink API with fallback image).
- Export a collection as a single `.html` file anyone can open.
- Local-first persistence using `localStorage`.
- Installable as a PWA with offline shell support.

## Run locally

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Notes

- No authentication or backend is used.
- Shared collections are distributed by the exported HTML file.
