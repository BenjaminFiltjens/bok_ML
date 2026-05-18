# TBM Machine Learning Thesis Explorer

A free static website for exploring TU Delft Technology, Policy and Management theses that use machine learning. The public site is designed for GitHub Pages: it serves cached JSON data, links back to TU Delft Repository records, and does not mirror thesis PDFs.

## What It Does

- Harvests public thesis metadata from the TU Delft Repository organisation endpoints.
- Keeps master and doctoral theses for Technology, Policy and Management.
- Uses the public ESS department people page as a hard staff filter, so records are kept only when an ESS staff member appears as an author or co-author.
- Detects machine-learning-related theses with curated method and domain rules plus manual overrides.
- Precomputes short summaries from public abstracts and metadata.
- Provides search, filters, an interactive Venn/taxonomy map, and thesis detail panels.

## Local Development

```powershell
npm install
npm run harvest
npm run dev
```

The app will be available at the URL printed by Vite, usually `http://127.0.0.1:5173/`.

## Data Refresh

```powershell
npm run harvest
```

The harvest writes `public/data/theses.json`. It uses these defaults:

- `TUD_ORG_ID=Organisation_03b4b014-5c14-4b45-b961-090135469dad`
- `TUD_REPOSITORY_API_BASE=https://repository.tudelft.nl`
- `HARVEST_PAGE_SIZE=100`
- `HARVEST_DETAIL_CONCURRENCY=2`
- `HARVEST_INDEX_LIMIT=0`
- `HARVEST_DETAIL_LIMIT=0`
- `HARVEST_FETCH_ALL_DETAILS=0`
- `HARVEST_SKIP_DETAILS=0`
- `HARVEST_INCLUDE_ARTICLES=0`

For a small smoke refresh:

```powershell
$env:HARVEST_INDEX_LIMIT=100; $env:HARVEST_DETAIL_LIMIT=25; npm run harvest
```

By default, the harvester first classifies the organisation-page metadata and only fetches detail pages for records that look machine-learning-related. Set `HARVEST_FETCH_ALL_DETAILS=1` only for a deep audit, because it can mean thousands of repository requests.

If the repository detail endpoint is slow, use `HARVEST_SKIP_DETAILS=1` to generate the full catalogue from organisation-page metadata only.

Refresh the ESS staff cache before a full harvest:

```powershell
npm run scrape:ess-staff
```

This writes `data/ess-staff.json` from the public ESS people page and linked TU Delft staff profiles. The harvester uses that file as a hard inclusion list: a record must include at least one matched ESS staff member and a mapped ESS unit/section to appear in the static site. If the last listed author or contributor is not from ESS, assignment falls back to the last matched ESS co-author in the record's people list.

To include journal articles and conference papers in the static dataset while keeping them hidden by default in the UI:

```powershell
$env:HARVEST_INCLUDE_ARTICLES=1; npm run harvest
```

Visitors can opt in to those records with the Articles toggle.

Manual corrections live in `data/manual-overrides.json`.

The generated JSON includes a `harvest.indexComplete` flag and per-object-type page summaries. In the current index-only mode, a complete harvest means all paginated master/doctoral thesis index pages were fetched; the ML total is still the classifier-selected subset, not a hand-audited ground-truth count.

Application-area assignment is based on the matched ESS staff unit/section from `data/ess-staff.json`, with `data/advisor-sections.json` kept as a manual correction layer. Text-based domain scoring is still shown as secondary tags in details, but it no longer decides the dominant application area when an ESS staff cache is available.

## Venn Layout

The interactive taxonomy map is derived from the Excalidraw scene in `venn.json`. To update the runtime layout after editing that scene:

```powershell
npm run export:venn
```

This writes a slim `src/data/venn-layout.json` file without embedded image blobs, keeping the GitHub Pages bundle small.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` builds and deploys the site on pushes to `main`, on manual runs, and weekly. The scheduled harvest is allowed to fail without breaking deployment, so the last committed `public/data/theses.json` remains a safe fallback.

After pushing to GitHub:

1. Open repository settings.
2. Go to Pages.
3. Set the source to GitHub Actions.
4. Push to `main` or run the workflow manually.

## Tests

```powershell
npm test
npm run build
```

Tests cover taxonomy detection, record normalization, search, taxonomy filters, and public-file filtering.
