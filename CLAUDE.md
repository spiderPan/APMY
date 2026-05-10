# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal Jekyll blog (`thepan.cn`) deployed to GitHub Pages on push to `master`. Most post content is Chinese; UI/theme is English. Theme is forked from Scriptor-Jekyll-Theme.

## Common commands

Local dev runs in Docker (the host needs Ruby/Bundler + Node otherwise):

- `docker compose up` — serve at `http://localhost:4000` with livereload (port 35729)
- `docker compose run jekyll npm run build` — full production build (webpack + `jekyll build`)
- `docker compose run jekyll npm run optimize-books` — regenerate WebP files under `images/books/` from JPGs (used by the flip-book viewer)
- `docker compose run jekyll npm run qrcode <url>` — write `qrcode.png` for a URL

`npm run start` (what the container runs) chains `bundle install`, `webpack --watch`, and `jekyll serve --livereload --incremental`. `npm run ci-build` is webpack-only and is what GitHub Actions invokes before `jekyll build`.

There is no test suite (`npm test` is a stub).

## Architecture

Two coupled build pipelines produce the deployed site:

1. **Jekyll** (Ruby, `_config.yml`) renders Markdown in `_posts/` through layouts in `_layouts/` and partials in `_includes/`, with SCSS in `_sass/` compiled via Jekyll's built-in Sass (style: compressed). Permalinks are `/:year/:month/:day/:title`. Plugins: `jekyll-paginate`, `jekyll-redirect-from`, `jekyll-seo-tag`.
2. **Webpack** (`webpack.config.js`) bundles `webpack/main.js` → `assets/js/main-bundle.js`. The bundle currently powers only the "Download As Image" button on posts (uses `dom-to-image` against `#post-content`). The bundle is committed-via-build, not source: the Dockerfile builds it in a Node stage and copies it into the Jekyll image; CI does the same on Pages deploys.

Post frontmatter uses an `author` key (e.g. `pan`, `yuyue`) that resolves against `_data/authors.json` in `_layouts/post.html`. Tags drive `/tags/` via `_layouts/tags.html`.

The flip-book viewer (`_includes/book_viewer.html`) is reused by multiple posts and expects pre-numbered images (cover + `prefix1.webp`, `prefix2.webp`, ...) under `images/books/<book>/`. `scripts/optimize-images.js` walks that tree and emits resized WebPs (1200×1200 cover-fit, quality 85), skipping ones already newer than the source JPG.

## Notion → blog sync

`.github/workflows/notion-sync.yml` runs `scripts/sync-notion.js` daily (and on demand). The script queries the Notion DB for pages with status `Ready to Review`, converts them with `notion-to-md`, downloads the Feature Image into `images/YYYYMMDD/cover-<slug>.jpg`, writes `_posts/YYYY-MM-DD-<slug>.md` with Jekyll frontmatter, then flips the Notion status to `In Review`. Output is opened as a PR on branch `notion-import/new-posts` — never push directly to `master`. Required secrets: `NOTION_TOKEN`, `NOTION_POST_DATABASE_ID`.

## Deploy

`.github/workflows/jekyll.yml` builds (Node 20 + Ruby 3.1) and deploys to GitHub Pages on push to `master`. The `concurrency: pages` group serializes deploys but does not cancel in-flight ones.
