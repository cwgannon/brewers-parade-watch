# Brewers Parade Watch

One page that brings the Brewers' World Series parade to you when you can't be on the curb:
the live streams, the route on a map with a parade tracker, downtown traffic cameras, a live
traffic map, fan chatter and photos, the beat reporters, and the weather on the lakefront.
Everything is in Brewers navy and gold, and it works on a phone or a big screen.

Built on parade day, Friday, October 30, 2026.

## The live page

**https://cwgannon.github.io/brewers-parade-watch/**

Share that address with anyone. It is served by GitHub Pages straight from the `main`
branch of this repo, so every push to `main` updates the live page within a minute or two.

### Publishing (first time, and every update)

Double-click **`publish.cmd`**. It creates the GitHub repo if it does not exist yet (public,
because GitHub Pages needs that on a free account), pushes the current code to `main`, and
turns on GitHub Pages. Run it again any time to push an update. It needs the
[GitHub CLI](https://cli.github.com) signed in (`gh auth login`), which is already the case
on the computer this was built on.

If you would rather do it by hand, these are the three commands it runs:

```
gh repo create cwgannon/brewers-parade-watch --public
git push -u origin HEAD:main
gh api -X POST repos/cwgannon/brewers-parade-watch/pages -f build_type=legacy -f "source[branch]=main" -f "source[path]=/"
```

## Running it on this computer

You need [Node.js](https://nodejs.org) version 22 or newer. Then either:

- double-click **`start.cmd`**, or
- in a terminal in this folder, run `node serve.js` (or `npm start`).

Either one starts a tiny web server and opens `http://localhost:4848/` in your browser.
Close the window (or press `Ctrl+C`) to stop it. Nothing gets installed; there is no build
step. To watch on your phone from the same Wi-Fi, open the `http://192.168.x.x:4848/`
address the server prints.

## Testing it

Either:

- double-click **`test.cmd`**, or
- run `node test.js` (or `npm test`). Add an address to test a live copy instead:
  `node test.js https://cwgannon.github.io/brewers-parade-watch/`

The test opens the page in a hidden Edge or Chrome window, waits for the live data, and
checks about twenty things: no script errors, no sideways scrolling on a phone, the
schedule and route drawn, feeds and cameras populated, and that zooming a tile in and out
works. It prints PASS / WARN / FAIL per check and saves screenshots (desktop, phone, phone
with the map zoomed) to `test-output/`. A WARN means an outside service such as Bluesky or
the DOT cameras did not answer in time, not that the page is broken.

The same test runs automatically on GitHub for every push (the "Smoke test" action), with
the screenshots attached to each run.

You can also drop the folder on any static web host (GitHub Pages, Netlify, a shared drive
served over HTTP). The page is plain HTML, CSS and JavaScript. Opening `index.html`
straight from the file system mostly works, but YouTube and Waze embeds prefer a real
`http://` address, which is why `serve.js` exists.

## What's on the page

Every section is a tile on the overview. Click a tile's title, or the arrows in its corner,
to zoom that section to full screen. Press `Esc` or the X to come back.

| Tile | What it shows | Where it comes from |
| --- | --- | --- |
| Brewers' Own Feed | The team's YouTube live stream, newest team videos, MLB live | YouTube embeds; links to the free Brewers.com stream |
| Right Now | Countdown, lakefront weather, the day's schedule with a NOW marker | Open-Meteo (no key) |
| Route Map & Parade Tracker | The route, landmarks, camera pins, an estimated parade position, arrival times for spots along the route | Leaflet + Esri map tiles |
| TV Live Streams | FOX6, WISN 12, TMJ4, CBS 58 | YouTube live embeds, with links to each station's own live page |
| Fan Chatter | Live posts from community-built Brewers feeds | Bluesky public API (no key) |
| Photo Wall | Every photo from those feeds and the reporters, newest first | Bluesky |
| Beat Reporters | McCalvy, Hogg, Sammon, Radcliffe, Lobner and @Brewers, merged into one feed | Bluesky |
| Traffic Cameras | Wisconsin DOT stills around downtown, refreshed every two minutes | 511wi.gov |
| Live Traffic Overhead | Waze's live map centered on the route | Waze embed |
| X / Twitter | The @Brewers timeline plus one-tap searches and reporter handles | X embed (works when X allows it) and plain links |
| More Ways In | Radio, Reddit, the team's newest videos, MLB Network | Links |

The parade tracker is an estimate: nobody publishes live GPS for the lead float. It assumes
the parade steps off at 10 a.m. and takes 90 minutes to reach the festival grounds. Two
sliders let you nudge the position and the pace to match what you see on TV.

## Changing things

All the facts live in `js/data.js`: start time, route coordinates, named spots, schedule,
camera ids, YouTube channel ids, Bluesky handles, X handles and links. Edit that file and
refresh. The page logic is in `js/app.js` and the look is in `css/style.css`.

## License

_Undecided for now. Pick one before this is shared or published._
