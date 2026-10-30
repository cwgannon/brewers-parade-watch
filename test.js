/* ---------------------------------------------------------------------------
   Smoke test for Brewers Parade Watch.

   Starts the local server, opens the page in a headless browser (Edge or
   Chrome, whichever is installed), waits for the live data to arrive, and
   checks the things that matter: no script errors, no sideways scrolling on a
   phone, feeds and cameras populated, the map drawn, zoom-in/zoom-out working.
   Screenshots land in test-output/ so you can eyeball the result.

   Run:   node test.js                 (tests the local copy)
          node test.js https://...     (tests a live copy, e.g. GitHub Pages)
   Needs Node 22 or newer. No packages to install.
--------------------------------------------------------------------------- */
"use strict";
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = __dirname;
const OUT = path.join(ROOT, "test-output");
const PORT = 4853;
const DBG = 9400 + Math.floor(Math.random() * 400);
const targetUrl = process.argv[2] || `http://localhost:${PORT}/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- find a browser ------------------------------------------------------
const candidates = [
  process.env.BROWSER_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/opt/pw-browsers/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
].filter(Boolean);
const BROWSER = candidates.find((p) => fs.existsSync(p));
if (!BROWSER) {
  console.error("No Edge or Chrome found. Install one, or set BROWSER_PATH to the browser executable.");
  process.exit(2);
}
if (typeof WebSocket === "undefined") {
  console.error("This test needs Node 22 or newer (it uses the built-in WebSocket).");
  process.exit(2);
}

// ---- results ---------------------------------------------------------------
const results = [];
function check(name, ok, detail, level) {
  results.push({ name, ok: !!ok, detail: detail || "", level: level || "FAIL" });
  const mark = ok ? "PASS" : level === "WARN" ? "WARN" : "FAIL";
  console.log(`  ${mark}  ${name}${detail ? "  (" + detail + ")" : ""}`);
}

// ---- helpers ---------------------------------------------------------------
function getJson(p) {
  return new Promise((res, rej) =>
    http.get(`http://127.0.0.1:${DBG}${p}`, (r) => {
      let s = "";
      r.on("data", (d) => (s += d)).on("end", () => { try { res(JSON.parse(s)); } catch (e) { rej(e); } });
    }).on("error", rej));
}

let server = null, browser = null, profileDir = null;
function cleanup() {
  try { if (browser) browser.kill(); } catch (e) {}
  try { if (server) server.kill(); } catch (e) {}
  try { if (profileDir) fs.rmSync(profileDir, { recursive: true, force: true }); } catch (e) {}
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  console.log(`Testing ${targetUrl}`);
  console.log(`Browser: ${BROWSER}`);

  if (!process.argv[2]) {
    server = spawn(process.execPath, [path.join(ROOT, "serve.js"), "--no-open"], { env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
  }
  profileDir = fs.mkdtemp ? fs.mkdtempSync(path.join(os.tmpdir(), "parade-test-")) : path.join(os.tmpdir(), "parade-test");
  browser = spawn(BROWSER, [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", "--no-default-browser-check",
    "--hide-scrollbars", `--remote-debugging-port=${DBG}`, `--user-data-dir=${profileDir}`, "--window-size=1400,900", "about:blank",
  ], { stdio: "ignore" });

  // Attach to the browser tab.
  let page = null;
  for (let i = 0; i < 60 && !page; i++) {
    try { page = (await getJson("/json/list")).find((t) => t.type === "page"); } catch (e) {}
    if (!page) await sleep(500);
  }
  if (!page) throw new Error("The browser never answered on the debugging port.");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = {}; const errors = [];
  ws.onmessage = (m) => {
    const j = JSON.parse(m.data);
    if (j.id && pending[j.id]) { pending[j.id](j); delete pending[j.id]; return; }
    if (j.method === "Runtime.exceptionThrown") errors.push((j.params.exceptionDetails.exception && j.params.exceptionDetails.exception.description) || j.params.exceptionDetails.text || "exception");
    if (j.method === "Runtime.consoleAPICalled" && j.params.type === "error") {
      const text = j.params.args.map((a) => a.value || a.description || "").join(" ");
      if (!/Tracking Prevention|third-party cookie/i.test(text)) errors.push(text.slice(0, 200));
    }
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const evalJs = async (expr) => {
    const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    return r.result && r.result.result ? r.result.result.value : undefined;
  };
  const setSize = async (w, h, mobile) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile }); await sleep(500); };
  const shot = async (name, fullPage) => {
    let clip;
    if (fullPage) {
      const m = await send("Page.getLayoutMetrics");
      const h = Math.min(Math.ceil(m.result.cssContentSize.height), 7000);
      clip = { x: 0, y: 0, width: m.result.cssLayoutViewport.clientWidth, height: h, scale: 1 };
    }
    const r = await send("Page.captureScreenshot", { format: "png", clip, captureBeyondViewport: !!fullPage });
    fs.writeFileSync(path.join(OUT, name), Buffer.from(r.result.data, "base64"));
  };
  await send("Page.enable"); await send("Runtime.enable");

  // ---- load the page and wait for live data (up to 25 s) -------------------
  await setSize(1400, 900, false);
  await send("Page.navigate", { url: targetUrl });
  const STATE = `JSON.stringify({
    title: document.title,
    clock: (document.querySelector('#clock')||{}).textContent,
    wx: (document.querySelector('#wx-chip')||{}).textContent,
    where: (document.querySelector('#where')||{}).textContent,
    schedule: document.querySelectorAll('#timeline li').length,
    chatter: document.querySelectorAll('#chatter-feed .linklist a').length,
    feedState: document.querySelector('#feed-frame iframe') ? document.querySelector('#feed-frame iframe').src : (document.querySelector('#feed-frame').textContent || '').trim(),
    reporters: document.querySelectorAll('#reporters-feed .post').length,
    photos: document.querySelectorAll('#photowall img').length,
    photoLinks: document.querySelectorAll('#photos-foot a').length,
    camsTotal: document.querySelectorAll('#cam-grid img').length,
    camsLoaded: [...document.querySelectorAll('#cam-grid img')].filter(i => i.naturalWidth > 0).length,
    tiles: document.querySelectorAll('.leaflet-tile-loaded').length,
    routePaths: document.querySelectorAll('.leaflet-overlay-pane path').length,
    pins: document.querySelectorAll('.leaflet-marker-pane .pin').length,
    iframes: document.querySelectorAll('iframe').length,
    spots: document.querySelectorAll('#spots button').length,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  })`;
  let st = {};
  for (let i = 0; i < 25; i++) {
    await sleep(1000);
    try { st = JSON.parse(await evalJs(STATE) || "{}"); } catch (e) { st = {}; }
    if (st.chatter > 0 && st.reporters > 0 && st.camsLoaded > 0 && st.tiles > 0 && st.wx && !/Weather/.test(st.wx)) break;
  }
  // Nudge lazy images into view so they load, then re-read.
  await evalJs("window.scrollTo(0, document.body.scrollHeight); 'ok'"); await sleep(2500);
  await evalJs("window.scrollTo(0, 0); 'ok'"); await sleep(500);
  st = JSON.parse(await evalJs(STATE) || "{}");

  console.log("\nChecks:");
  check("Page loaded with the right title", /Parade Watch/.test(st.title || ""), st.title);
  check("No JavaScript errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  check("Clock is ticking", /\d:\d\d .M CT/.test(st.clock || ""), st.clock);
  check("Schedule rendered", st.schedule === 7, st.schedule + " items");
  check("Parade tracker has a status", !!st.where && st.where.length > 10, st.where);
  check("Spots list rendered", st.spots === 8, st.spots + " spots");
  check("Route drawn on the map", st.routePaths >= 2, st.routePaths + " paths");
  check("Landmark and camera pins on the map", st.pins >= 30, st.pins + " pins");
  check("Video and map frames embedded", st.iframes >= 4, st.iframes + " iframes");
  check("Desktop layout has no sideways scroll", st.overflow <= 0, "overflow " + st.overflow + "px");
  // Things that depend on outside services get a WARN, not a FAIL.
  check("Weather arrived (Open-Meteo)", !!st.wx && !/Weather/.test(st.wx), st.wx, "WARN");
  check("Map tiles loaded (Esri)", st.tiles > 0, st.tiles + " tiles", "WARN");
  check("Fan chatter opens on the X searches", st.chatter === 4, st.chatter + " links");
  check("Brewers tab shows a player or an offline message", !!st.feedState && !/Checking/.test(st.feedState), st.feedState);
  check("Beat reporters arrived (Bluesky)", st.reporters > 0, st.reporters + " posts", "WARN");
  check("Photo wall has links to photos elsewhere", st.photoLinks === 5, st.photoLinks + " links");
  check("Photo wall has photos", st.photos > 0, st.photos + " photos", "WARN");
  check("Traffic camera stills loaded (WisDOT)", st.camsLoaded > 0, st.camsLoaded + "/" + st.camsTotal, "WARN");
  await shot("desktop.png", true);

  // ---- phone ---------------------------------------------------------------
  await setSize(390, 844, true);
  await sleep(800);
  const phone = JSON.parse(await evalJs(STATE) || "{}");
  check("Phone layout has no sideways scroll", phone.overflow <= 0, "overflow " + phone.overflow + "px");
  await shot("phone.png", true);

  // ---- zoom in / zoom out --------------------------------------------------
  await evalJs("document.querySelector('#map .expand-btn').click(); 'ok'"); await sleep(1200);
  const focus = JSON.parse(await evalJs(`(() => {
    const t = document.querySelector('.tile.is-focused');
    if (!t) return JSON.stringify({ focused: null });
    const f = t.querySelector('.tile-foot').getBoundingClientRect();
    const b = t.querySelector('.tile-body').getBoundingClientRect();
    const onTop = document.elementFromPoint(195, 420);
    return JSON.stringify({ focused: t.id, hash: location.hash, locked: document.body.classList.contains('locked'),
      overlap: f.top < b.bottom - 1, onTop: onTop ? (onTop.closest('.tile') || {}).id : null });
  })()`) || "{}");
  check("Zooming a tile makes it full screen", focus.focused === "map" && focus.locked && focus.hash === "#map/full", JSON.stringify(focus));
  check("Zoomed tile stacks its content (no overlap)", focus.focused === "map" && !focus.overlap);
  check("Zoomed tile sits on top of everything", focus.onTop === "map", "on top: " + focus.onTop);
  await shot("phone-map-zoomed.png", false);
  await evalJs("document.querySelector('#map .close-btn').click(); 'ok'"); await sleep(600);
  const after = await evalJs("document.querySelectorAll('.tile.is-focused').length + ' ' + location.hash + ' ' + document.body.classList.contains('locked')");
  check("Closing returns to the overview", after === "0 #map false", after);

  // ---- camera viewer -------------------------------------------------------
  const CAM = `JSON.stringify({
    open: !document.querySelector('#cam-viewer').hidden,
    count: document.querySelector('#cam-count').textContent,
    name: document.querySelector('#cam-name').textContent,
    photo: document.querySelector('#cam-photo').naturalWidth,
    size: document.querySelector('#cam-photo').naturalWidth + 'x' + document.querySelector('#cam-photo').naturalHeight,
    onTop: (document.elementFromPoint(195, 400) || {}).id || '',
    focused: document.querySelectorAll('.tile.is-focused').length,
    tabs: document.querySelector('main').inert,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  })`;
  const camState = async () => JSON.parse(await evalJs(CAM) || "{}");
  const press = (key) => evalJs(`document.dispatchEvent(new KeyboardEvent('keydown', { key: '${key}', bubbles: true })); 'ok'`);
  await evalJs("document.querySelector('#cam-grid a.cam').click(); 'ok'"); await sleep(1500);
  let cam = await camState();
  check("Clicking a camera opens the viewer on the page", cam.open && cam.count === "1 of 32" && cam.onTop === "cam-photo", JSON.stringify(cam));
  check("Viewer has no sideways scroll on a phone", cam.overflow <= 0, "overflow " + cam.overflow + "px");
  check("Viewer shows the camera picture (WisDOT)", cam.photo > 0, cam.size, "WARN");
  await shot("phone-camera-viewer.png", false);
  await press("ArrowRight"); await sleep(300);
  check("Right arrow goes to the next camera", (await camState()).count === "2 of 32");
  await press("ArrowLeft"); await press("ArrowLeft"); await sleep(300);
  check("Left arrow wraps around to the last camera", (await camState()).count === "32 of 32");
  await press("Escape"); await sleep(400);
  check("Esc closes the viewer", !(await camState()).open);
  await evalJs("document.querySelector('#cam-grid a.cam').click(); 'ok'"); await sleep(400);
  await evalJs("history.back(); 'ok'"); await sleep(600);
  cam = await camState();
  check("Back button closes the viewer and stays on the page", !cam.open && !cam.tabs, JSON.stringify(cam));

  await evalJs("document.querySelector('#cams .expand-btn').click(); 'ok'"); await sleep(800);
  await evalJs("document.querySelector('#cam-grid a.cam').click(); 'ok'"); await sleep(400);
  await setSize(1400, 900, false);
  await shot("desktop-camera-viewer.png", false);
  await press("Escape"); await sleep(400);
  cam = await camState();
  check("Esc closes the viewer but not the zoomed tile behind it", !cam.open && cam.focused === 1, JSON.stringify(cam));
  await evalJs("document.querySelector('#cams .close-btn').click(); 'ok'"); await sleep(400);

  // ---- summary -------------------------------------------------------------
  ws.close();
  const fails = results.filter((r) => !r.ok && r.level === "FAIL");
  const warns = results.filter((r) => !r.ok && r.level === "WARN");
  console.log(`\n${results.length - fails.length - warns.length} passed, ${warns.length} warnings, ${fails.length} failures.`);
  console.log(`Screenshots: ${OUT}`);
  if (warns.length) console.log("Warnings mean an outside service (Bluesky, WisDOT, weather, map tiles) did not answer in time. Try again in a minute.");
  cleanup();
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => { console.error("Test could not run:", e.message || e); cleanup(); process.exit(2); });
