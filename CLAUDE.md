# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

brewers-parade-watch — a single-page "parade experience" dashboard for the Brewers' 2026 World
Series parade: streams, route map with a parade tracker, traffic cameras, fan chatter, beat
reporters, weather. Built on parade day (October 30, 2026). See [`README.md`](README.md).

## Communication style

Write for cwg, who owns this project and does not write code for a living. Lead with
what changed and what it now does; put the mechanism underneath. Plain English beats
jargon, and a sentence that only parses if you already know the code is a sentence that
failed.

## Commands

From the repo root (Node 22+):

```
node serve.js            # start the local server and open http://localhost:4848/  (also: start.cmd, npm start)
node serve.js --no-open  # same, without opening a browser (PORT=4848 env var changes the port)
node test.js             # headless-browser smoke test, screenshots in test-output/  (also: test.cmd, npm test)
node test.js <url>       # same checks against a live copy, e.g. the GitHub Pages address
publish.cmd              # create the GitHub repo if needed, push main, enable GitHub Pages
```

Live site: https://cwgannon.github.io/brewers-parade-watch/ (GitHub Pages, deployed from
`main`, root folder). The "Smoke test" GitHub Action runs `node test.js` on every push.

## Architecture

Static site, no build step, no dependencies to install.

- `index.html` holds the page skeleton: a sticky header with live status chips, a hero with
  the countdown, a jump nav, and a 12-column grid of `.tile` sections (one per data source).
- `js/data.js` is the single source of facts: parade start time, route coordinates, named
  spots, schedule, WisDOT camera ids, YouTube channel ids, Bluesky feed URIs and handles,
  X handles, links. Change the day here, not in the logic.
- `js/app.js` does everything else: tile expand/close (focus mode), clock and countdown,
  Open-Meteo weather, YouTube tab frames, the Leaflet map and tracker math, Bluesky fetches
  (getFeed for chatter, getAuthorFeed for reporters), camera refresh, Waze iframe, X embed,
  confetti.
- `css/style.css` is mobile-first; the grid only becomes 12 columns at 760px.
- `serve.js` is a zero-dependency static file server so embeds get an `http://` origin.

Data sources that need no key: Open-Meteo, Bluesky public API (`public.api.bsky.app`),
WisDOT camera stills (`https://511wi.gov/map/Cctv/<viewId>`), Esri map tiles,
Waze embed, YouTube embeds.

## Invariants

- Focus mode must not move a tile in the DOM. It is done with CSS (`.tile.is-focused` is
  `position: fixed`), so iframes keep playing when a tile is zoomed. Moving the element
  would reload every video.
- Every `.tile` has `isolation: isolate`. Without it, Leaflet's internal z-indexes (400 to
  1000) paint the map and its zoom buttons on top of whichever tile is zoomed in.
- `js/data.js` must stay plain data (no fetches, no DOM). It is the file a non-coder edits.
- Bluesky's `searchPosts` endpoint refuses anonymous browsers (403, no CORS header). Use
  `getFeed` with a feed generator URI or `getAuthorFeed`; both allow CORS.
- Map tiles must come from Esri's ArcGIS Online services (World_Street_Map, World_Imagery).
  OpenStreetMap's tile servers block publicly shared sites ("Access blocked" tiles) and
  CARTO now requires an API key. The "Night" map is the Esri street map with a CSS invert
  filter (`.tiles-night`), not a dark tile provider.
- The page sets `<meta name="referrer" content="no-referrer">` so WisDOT camera stills and
  third-party images load from any origin. Keep it.
- Parade times are Central Daylight Time (UTC-5) and are written as full ISO strings with
  the offset in `data.js`, so the page is right in any viewer's time zone.
