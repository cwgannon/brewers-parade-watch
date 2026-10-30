/* ---------------------------------------------------------------------------
   Brewers Parade Watch - page logic.
   Plain browser JavaScript, no build step. Reads its settings from js/data.js.
--------------------------------------------------------------------------- */
(function () {
  "use strict";
  const D = window.PW;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const START = new Date(D.paradeStart);
  const END = new Date(D.partyEnds);
  const TZ = "America/Chicago";

  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtTime = (d) => new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ });
  const pad = (n) => String(n).padStart(2, "0");
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const visible = () => document.visibilityState !== "hidden";

  // =========================================================================
  // Tiles: expand / close (focus mode). The tile never moves in the DOM, it is
  // just pinned full-screen with CSS, so videos keep playing when you zoom in.
  // =========================================================================
  const ICON_EXPAND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
  const ICON_CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  let focused = null;

  function setupTiles() {
    $$(".tile").forEach((tile) => {
      const tools = $(".tile-tools", tile);
      tools.innerHTML =
        `<button class="icon-btn expand-btn" type="button" title="Zoom in" aria-label="Zoom in on ${esc($("h2", tile).textContent)}">${ICON_EXPAND}</button>` +
        `<button class="icon-btn close-btn" type="button" title="Back to overview (Esc)" aria-label="Back to overview">${ICON_CLOSE}</button>`;
      $(".expand-btn", tile).addEventListener("click", () => focusTile(tile.id));
      $(".close-btn", tile).addEventListener("click", closeFocus);
      $("h2", tile).addEventListener("click", () => {
        if (!tile.classList.contains("is-focused")) focusTile(tile.id);
      });
    });
    window.addEventListener("hashchange", applyHash);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && focused) closeFocus();
    });
    applyHash();
  }
  function focusTile(id) {
    const want = "#" + id + "/full";
    if (location.hash === want) applyHash();
    else location.hash = want;
  }
  function closeFocus() {
    if (!focused) return;
    const id = focused.id;
    history.replaceState(null, "", "#" + id);
    applyHash();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ block: "start" });
  }
  function applyHash() {
    const m = /^#([\w-]+)\/full$/.exec(location.hash);
    const id = m ? m[1] : null;
    if (focused && focused.id !== id) {
      focused.classList.remove("is-focused");
      focused = null;
      document.body.classList.remove("locked");
      if (map) setTimeout(() => map.invalidateSize(), 60);
    }
    if (id) {
      const tile = document.getElementById(id);
      if (tile && tile.classList.contains("tile")) {
        tile.classList.add("is-focused");
        document.body.classList.add("locked");
        tile.scrollTop = 0;
        focused = tile;
        if (map) setTimeout(() => { map.invalidateSize(); fitRoute(); }, 80);
      }
    }
  }

  // =========================================================================
  // Clock, countdown, schedule
  // =========================================================================
  let confettiFiredAtStart = false;
  function tickClock() {
    const now = new Date();
    $("#clock").textContent = fmtTime(now) + " CT";
    const cd = $("#countdown");
    const badge = $("#live-badge");
    const diff = START - now;
    if (diff > 0) {
      const s = Math.floor(diff / 1000);
      const h = Math.floor(s / 3600), mi = Math.floor((s % 3600) / 60), se = s % 60;
      cd.innerHTML = `<small>Steps off in</small> ${h > 0 ? h + ":" : ""}${pad(mi)}:${pad(se)}`;
      badge.className = "chip";
      badge.innerHTML = '<span class="dot idle"></span> Pre-parade';
    } else if (now < END) {
      const mins = Math.floor(-diff / 60000);
      cd.innerHTML = `<small>Parade day &middot; ${mins} min since step-off</small> LIVE NOW`;
      badge.className = "chip live";
      badge.innerHTML = '<span class="dot"></span> Parade is on';
      if (!confettiFiredAtStart && -diff < 120000) { confettiFiredAtStart = true; burst(260); }
    } else {
      cd.innerHTML = "<small>That&rsquo;s a wrap</small> WORLD CHAMPS";
      badge.className = "chip gold";
      badge.innerHTML = '<span class="dot ok"></span> Celebration complete';
    }
    renderSchedule(now);
  }

  let scheduleBuilt = false;
  function renderSchedule(now) {
    const ol = $("#timeline");
    if (!scheduleBuilt) {
      ol.innerHTML = D.schedule.map((s) =>
        `<li data-t="${new Date(s.time).getTime()}"><time>${esc(fmtTime(s.time))}</time><div><div class="what">${esc(s.what)}</div><div class="where">${esc(s.where)}</div></div></li>`
      ).join("");
      scheduleBuilt = true;
    }
    const items = $$("li", ol);
    let currentIdx = -1;
    items.forEach((li, i) => { if (+li.dataset.t <= now.getTime()) currentIdx = i; });
    items.forEach((li, i) => {
      li.classList.toggle("past", i < currentIdx);
      li.classList.toggle("now", i === currentIdx && now < END);
    });
  }

  // =========================================================================
  // Weather (Open-Meteo, no key)
  // =========================================================================
  const WX = {
    0: ["Clear", "☀️"], 1: ["Mostly clear", "🌤️"], 2: ["Partly cloudy", "⛅"], 3: ["Overcast", "☁️"],
    45: ["Fog", "🌫️"], 48: ["Icy fog", "🌫️"],
    51: ["Light drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Heavy drizzle", "🌧️"],
    61: ["Light rain", "🌧️"], 63: ["Rain", "🌧️"], 65: ["Heavy rain", "🌧️"],
    66: ["Freezing rain", "🌧️"], 67: ["Freezing rain", "🌧️"],
    71: ["Light snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy snow", "❄️"], 77: ["Snow grains", "🌨️"],
    80: ["Showers", "🌦️"], 81: ["Showers", "🌧️"], 82: ["Heavy showers", "⛈️"],
    85: ["Snow showers", "🌨️"], 86: ["Snow showers", "🌨️"],
    95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm, hail", "⛈️"], 99: ["Thunderstorm, hail", "⛈️"],
  };
  const wx = (code) => WX[code] || ["Weather", "🌤️"];

  async function loadWeather() {
    if (!visible()) return;
    const u = new URL("https://api.open-meteo.com/v1/forecast");
    const p = u.searchParams;
    p.set("latitude", D.weather.lat); p.set("longitude", D.weather.lon);
    p.set("current", "temperature_2m,apparent_temperature,wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation,weather_code,relative_humidity_2m");
    p.set("hourly", "temperature_2m,precipitation_probability,weather_code");
    p.set("forecast_days", "1"); p.set("temperature_unit", "fahrenheit"); p.set("wind_speed_unit", "mph"); p.set("precipitation_unit", "inch");
    p.set("timezone", TZ);
    try {
      const r = await fetch(u);
      const j = await r.json();
      const c = j.current;
      const [desc, icon] = wx(c.weather_code);
      const dir = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round((c.wind_direction_10m || 0) / 45) % 8];
      $("#weather").innerHTML =
        `<div class="temp">${Math.round(c.temperature_2m)}<sup>&deg;F</sup></div>` +
        `<div><div class="desc">${icon} ${esc(desc)} on the lakefront</div>` +
        `<div class="meta">Feels like ${Math.round(c.apparent_temperature)}&deg; &middot; wind ${Math.round(c.wind_speed_10m)} mph ${dir}, gusts ${Math.round(c.wind_gusts_10m)} &middot; humidity ${c.relative_humidity_2m}%</div></div>`;
      $("#wx-chip").textContent = `${Math.round(c.temperature_2m)}° ${desc}`;
      const h = j.hourly;
      const nowHour = new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: TZ });
      let html = "";
      for (let i = 0; i < h.time.length; i++) {
        const hr = parseInt(h.time[i].slice(11, 13), 10);
        if (hr < 7 || hr > 16) continue;
        const [, ic] = wx(h.weather_code[i]);
        const label = hr === 12 ? "12 pm" : hr > 12 ? (hr - 12) + " pm" : hr + " am";
        html += `<div class="${hr === parseInt(nowHour, 10) ? "now" : ""}"><span>${label}</span><b>${Math.round(h.temperature_2m[i])}&deg;</b><span>${ic} ${h.precipitation_probability[i]}%</span></div>`;
      }
      $("#hourly").innerHTML = html;
    } catch (e) {
      $("#weather .desc").textContent = "Weather is taking a rain delay. Will retry.";
      $("#wx-chip").textContent = "Weather n/a";
    }
  }

  // =========================================================================
  // YouTube tabs (team feed, TV stations, latest videos)
  // =========================================================================
  function ytLive(id, autoplay) {
    return `https://www.youtube.com/embed/live_stream?channel=${id}&autoplay=${autoplay ? 1 : 0}&rel=0`;
  }
  function setFrame(frameEl, src) {
    frameEl.innerHTML = `<iframe src="${esc(src)}" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" title="Video player"></iframe>`;
  }
  function setupTabbedFrames(tabsEl, frameEl, noteEl, tabs, startAt) {
    tabsEl.innerHTML = tabs.map((t, i) =>
      `<button type="button" role="tab" data-i="${i}" aria-selected="${i === 0}">${esc(t.label)}</button>`).join("");
    const show = (i, autoplay) => {
      $$("button", tabsEl).forEach((b) => b.setAttribute("aria-selected", String(+b.dataset.i === i)));
      setFrame(frameEl, tabs[i].src(autoplay));
      if (noteEl) noteEl.innerHTML = tabs[i].note || "";
    };
    tabsEl.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (b) show(+b.dataset.i, true);
    });
    show(startAt || 0, false);
  }
  function setupVideo() {
    const Y = D.youtube;
    const uploads = "UU" + Y.brewers.id.slice(2);
    // Live streams only exist around parade time. Outside that window the
    // "live" embed is just a black box, so start on the videos tab instead.
    const now = Date.now();
    const liveWindow = now >= START.getTime() - 20 * 60000 && now <= START.getTime() + 4 * 3600000;
    setupTabbedFrames($("#feed-tabs"), $("#feed-frame"), $("#feed-note"), [
      { label: "Brewers live on YouTube", src: (a) => ytLive(Y.brewers.id, a),
        note: `If YouTube says the stream is offline, the team's free stream is on <a href="${D.links.freeStream}" target="_blank" rel="noopener">Brewers.com</a> and MLB Network / MLB.TV.` },
      { label: "Latest Brewers videos", src: () => `https://www.youtube.com/embed/videoseries?list=${uploads}&rel=0`,
        note: "The newest uploads from the Brewers' channel. Celebration clips show up here within minutes." },
      { label: "MLB live", src: (a) => ytLive(Y.mlb.id, a), note: `MLB's channel. If it's offline, try <a href="${Y.mlb.fallback}" target="_blank" rel="noopener">MLB's live page</a>.` },
    ], liveWindow ? 0 : 1);
    const station = (key) => ({
      label: Y[key].name,
      src: (a) => ytLive(Y[key].id, a),
      note: `${Y[key].name}'s YouTube live feed. If it says offline, open <a href="${Y[key].fallback}" target="_blank" rel="noopener">${Y[key].name}'s own live page</a>.`,
    });
    setupTabbedFrames($("#tv-tabs"), $("#tv-frame"), $("#tv-note"), [station("fox6"), station("wisn"), station("tmj4"), station("cbs58")]);
    setFrame($("#more-frame"), `https://www.youtube.com/embed/videoseries?list=${uploads}&rel=0`);
  }

  // =========================================================================
  // Map + parade tracker (Leaflet)
  // =========================================================================
  let map = null, paradeMarker = null, camLayer = null, routeLine = null;
  const layers = {};
  const route = D.route;
  const cum = [0];
  function haversine(a, b) {
    const R = 6371000, toR = Math.PI / 180;
    const dLat = (b[0] - a[0]) * toR, dLon = (b[1] - a[1]) * toR;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  for (let i = 1; i < route.length; i++) cum.push(cum[i - 1] + haversine(route[i - 1], route[i]));
  const TOTAL = cum[cum.length - 1];
  function positionAt(frac) {
    const d = clamp(frac, 0, 1) * TOTAL;
    for (let i = 1; i < route.length; i++) {
      if (d <= cum[i]) {
        const t = (d - cum[i - 1]) / Math.max(1, cum[i] - cum[i - 1]);
        return [route[i - 1][0] + (route[i][0] - route[i - 1][0]) * t, route[i - 1][1] + (route[i][1] - route[i - 1][1]) * t];
      }
    }
    return route[route.length - 1];
  }
  const pinIcon = (label, cls) => L.divIcon({ className: "pin-wrap", html: `<div class="pin ${cls || ""}"><span>${esc(label)}</span></div>`, iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -24] });
  const camIcon = L.divIcon({ className: "pin-wrap", html: '<div class="pin cam"><span>&#9679;</span></div>', iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -10] });
  const paradeIcon = L.divIcon({ className: "pin-wrap", html: '<div class="parade-marker">&#127942;</div>', iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -18] });

  function fitRoute() {
    if (map && routeLine) map.fitBounds(routeLine.getBounds(), { padding: [24, 24] });
  }
  function setupMap() {
    if (typeof L === "undefined") { $("#leaflet").innerHTML = '<div class="placeholder">The map library did not load. Check the connection and refresh.</div>'; return; }
    map = L.map("leaflet", { zoomControl: true, scrollWheelZoom: false, attributionControl: true });
    // All three layers come from Esri's ArcGIS Online tile services, which allow
    // public use with attribution and need no key. (OpenStreetMap's own tile
    // servers block sites that are shared with the public.) "Night" is the
    // street map with a CSS filter that flips it dark, so the gold route pops.
    const esri = "https://server.arcgisonline.com/ArcGIS/rest/services/";
    const streetAttr = "Tiles &copy; Esri &mdash; Esri, TomTom, Garmin, FAO, NOAA, USGS, OpenStreetMap contributors";
    layers.dark = L.tileLayer(esri + "World_Street_Map/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, className: "tiles-night", attribution: streetAttr });
    layers.streets = L.tileLayer(esri + "World_Street_Map/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: streetAttr });
    layers.sat = L.tileLayer(esri + "World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Tiles &copy; Esri, Maxar, Earthstar Geographics" });
    layers.dark.addTo(map);
    $("#map-layers").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      Object.values(layers).forEach((l) => map.removeLayer(l));
      layers[b.dataset.layer].addTo(map);
      $$("button", $("#map-layers")).forEach((x) => x.setAttribute("aria-selected", String(x === b)));
    });

    L.polyline(route, { color: "#ffffff", weight: 10, opacity: 0.55 }).addTo(map);
    routeLine = L.polyline(route, { color: "#ffc52f", weight: 6, opacity: 1 }).addTo(map);
    L.marker(route[0], { icon: pinIcon("GO", "") }).addTo(map).bindPopup("<b>Step-off, 10 a.m.</b><br>N. 4th St (Vel R. Phillips Ave) &amp; W. Wisconsin Ave");
    L.marker(route[route.length - 1], { icon: pinIcon("END", "") }).addTo(map).bindPopup("<b>Henry Maier Festival Park</b><br>Rally stage: American Family Insurance Amphitheater");
    D.landmarks.forEach((lm) => L.marker([lm.lat, lm.lon], { icon: pinIcon(lm.label, "white") }).addTo(map).bindPopup(`<b>${esc(lm.name)}</b>`));

    camLayer = L.layerGroup().addTo(map);
    D.cams.forEach((c) => {
      const m = L.marker([c.lat, c.lon], { icon: camIcon, title: c.name });
      m.bindPopup(() => `<b>${esc(c.name)}</b><br><small>WisDOT camera, still refreshes about every 3 min</small><img src="${D.camImage(c.view)}?t=${Date.now()}" alt="${esc(c.name)}" width="320"><a href="${D.camImage(c.view)}" target="_blank" rel="noopener">Open full size</a>`, { maxWidth: 340 });
      camLayer.addLayer(m);
    });
    $("#show-cams").addEventListener("change", (e) => { if (e.target.checked) camLayer.addTo(map); else map.removeLayer(camLayer); });

    paradeMarker = L.marker(route[0], { icon: paradeIcon, zIndexOffset: 1000 }).addTo(map).bindPopup("Estimated front of the parade");
    fitRoute();
    setupTracker();
  }

  // ---- tracker state
  const tracker = { pace: D.defaultPaceMinutes, manual: null };
  function clockFraction(now) {
    return clamp((now - START) / (tracker.pace * 60000), 0, 1);
  }
  function spotEta(spot) {
    return new Date(START.getTime() + (cum[spot.at] / TOTAL) * tracker.pace * 60000);
  }
  function setupTracker() {
    const pos = $("#pos"), pace = $("#pace");
    pace.value = tracker.pace;
    pace.addEventListener("input", () => { tracker.pace = +pace.value; $("#pace-label").textContent = pace.value; updateTracker(); });
    pos.addEventListener("input", () => { tracker.manual = +pos.value / 1000; updateTracker(); });
    $("#follow-clock").addEventListener("click", () => { tracker.manual = null; updateTracker(); });
    $("#spots").innerHTML = D.spots.map((s, i) =>
      `<li><button type="button" data-i="${i}"><span><b>${esc(s.name)}</b><small>${esc(s.note)}</small></span><span class="eta" data-eta></span></button></li>`).join("");
    $("#spots").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const s = D.spots[+b.dataset.i];
      map.flyTo(route[s.at], 17, { duration: 0.8 });
      L.popup().setLatLng(route[s.at]).setContent(`<b>${esc(s.name)}</b><br>${esc(s.note)}<br><small>Estimated arrival ${esc(fmtTime(spotEta(s)))}</small>`).openOn(map);
    });
    updateTracker();
  }
  function updateTracker() {
    if (!map) return;
    const now = new Date();
    const f = tracker.manual == null ? clockFraction(now) : tracker.manual;
    paradeMarker.setLatLng(positionAt(f));
    $("#progress").style.width = (f * 100).toFixed(1) + "%";
    if (tracker.manual == null) $("#pos").value = Math.round(f * 1000);
    $("#follow-clock").classList.toggle("primary", tracker.manual != null);
    $("#follow-clock").textContent = tracker.manual != null ? "Follow the clock again" : "Following the clock";

    const dist = f * TOTAL;
    let before = D.spots[0], after = null;
    for (const s of D.spots) { if (cum[s.at] <= dist + 1) before = s; else if (!after) after = s; }
    let where;
    if (tracker.manual == null && now < START) where = `Staging at 4th &amp; Wisconsin. Steps off at ${esc(fmtTime(START))}.`;
    else if (f >= 1) where = "At the festival grounds. Rally time.";
    else if (after) where = `Est. between <u>${esc(before.name)}</u> and <u>${esc(after.name)}</u>`;
    else where = `Est. near ${esc(before.name)}`;
    $("#where").innerHTML = where;

    $$("#spots button").forEach((b, i) => {
      const s = D.spots[i];
      const eta = spotEta(s);
      b.querySelector("[data-eta]").textContent = fmtTime(eta);
      b.classList.toggle("passed", tracker.manual == null ? eta < now : cum[s.at] < dist);
    });
  }

  // =========================================================================
  // Bluesky feeds (public API, no key)
  // =========================================================================
  async function bsky(path, params) {
    const u = new URL("https://public.api.bsky.app/xrpc/" + path);
    Object.entries(params || {}).forEach(([k, v]) => u.searchParams.set(k, v));
    const r = await fetch(u, { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error("Bluesky " + r.status);
    return r.json();
  }
  function postImages(p) {
    const e = p.embed;
    if (!e) return [];
    if (e.$type === "app.bsky.embed.images#view") return e.images || [];
    if (e.$type === "app.bsky.embed.recordWithMedia#view" && e.media && e.media.$type === "app.bsky.embed.images#view") return e.media.images || [];
    return [];
  }
  function postUrl(p) {
    return `https://bsky.app/profile/${p.author.handle}/post/${p.uri.split("/").pop()}`;
  }
  function timeAgo(iso) {
    const s = Math.max(0, (Date.now() - new Date(iso)) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + "m";
    if (s < 86400) return Math.floor(s / 3600) + "h";
    return Math.floor(s / 86400) + "d";
  }
  function postHtml(p, badge) {
    const a = p.author, rec = p.record || {};
    const imgs = postImages(p);
    return `<a class="post" href="${esc(postUrl(p))}" target="_blank" rel="noopener">
      <img class="avatar" src="${esc(a.avatar || "")}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
      <div>
        <div class="who"><b>${esc(a.displayName || a.handle)}</b><span>@${esc(a.handle)}</span><span>&middot; ${esc(timeAgo(rec.createdAt))}</span>${badge ? `<span>&middot; ${esc(badge)}</span>` : ""}</div>
        <div class="text">${esc(rec.text || "")}</div>
        ${imgs.length ? `<div class="pics">${imgs.slice(0, 4).map((im) => `<img src="${esc(im.thumb)}" alt="${esc(im.alt || "")}" loading="lazy">`).join("")}</div>` : ""}
        <div class="stats"><span>&#9829; ${p.likeCount || 0}</span><span>&#8635; ${p.repostCount || 0}</span><span>&#128172; ${p.replyCount || 0}</span></div>
      </div></a>`;
  }
  function emptyFeed(msg, links) {
    return `<div class="feed-empty"><div>${msg}</div><div class="row" style="justify-content:center">${(links || []).map((l) => `<a class="btn small" href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("")}</div></div>`;
  }

  // ---- fan chatter (community feeds)
  const chatter = { tab: 0, cache: {} };
  async function feedPosts(uri, limit) {
    const j = await bsky("app.bsky.feed.getFeed", { feed: uri, limit: limit || 40 });
    // Newest first, and skip anything older than a few days (some feeds pin an
    // old "about this feed" post at the top).
    const cutoff = Date.now() - 3 * 86400000;
    return (j.feed || []).map((it) => it.post)
      .filter((p) => p && p.record && p.record.text && new Date(p.record.createdAt).getTime() > cutoff)
      .sort((a, b) => new Date(b.record.createdAt) - new Date(a.record.createdAt));
  }
  function setupChatter() {
    const S = D.bluesky.feeds;
    $("#chatter-tabs").innerHTML = S.map((s, i) => `<button type="button" role="tab" data-i="${i}" aria-selected="${i === 0}">${esc(s.label)}</button>`).join("");
    $("#chatter-tabs").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      chatter.tab = +b.dataset.i;
      $$("#chatter-tabs button").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      loadChatter(true);
    });
    $("#chatter-foot").innerHTML =
      `<a class="btn small" href="${esc(D.links.bskySearch("brewers parade"))}" target="_blank" rel="noopener">Search Bluesky</a>` +
      `<a class="btn small" href="${esc(D.links.xSearch("\"brewers parade\""))}" target="_blank" rel="noopener">Search X</a>` +
      `<a class="btn small" href="${esc(D.links.reddit)}" target="_blank" rel="noopener">r/Brewers</a>`;
    loadChatter(true);
  }
  async function loadChatter(force) {
    if (!visible() && !force) return;
    const s = D.bluesky.feeds[chatter.tab];
    const feed = $("#chatter-feed");
    try {
      const posts = await feedPosts(s.uri, 40);
      chatter.cache[s.uri] = posts;
      feed.innerHTML = posts.length ? posts.map((p) => postHtml(p)).join("") : emptyFeed("Nothing in this feed yet. Give it a minute.");
      renderPhotos();
    } catch (e) {
      feed.innerHTML = emptyFeed(
        "Bluesky is not answering right now. The reporters' feed may still work, and these open the same searches elsewhere.",
        [{ label: "Search Bluesky", href: D.links.bskySearch(s.q) }, { label: "Search X", href: D.links.xSearch(s.q) }, { label: "r/Brewers", href: D.links.reddit }]
      );
    }
  }

  // ---- beat reporters (merged author feeds)
  let reporterPosts = [];
  async function loadReporters(force) {
    if (!visible() && !force) return;
    const R = D.bluesky.reporters;
    const results = await Promise.allSettled(R.map((r) => bsky("app.bsky.feed.getAuthorFeed", { actor: r.handle, limit: 15, filter: "posts_no_replies" })));
    const seen = new Set();
    const posts = [];
    results.forEach((res, i) => {
      if (res.status !== "fulfilled") return;
      (res.value.feed || []).forEach((item) => {
        const p = item.post;
        if (!p || seen.has(p.uri)) return;
        seen.add(p.uri);
        p._badge = item.reason ? "reposted by " + R[i].who.split(",")[0] : "";
        p._sort = new Date(item.reason && item.reason.indexedAt ? item.reason.indexedAt : p.record.createdAt).getTime();
        posts.push(p);
      });
    });
    posts.sort((a, b) => b._sort - a._sort);
    reporterPosts = posts;
    const feed = $("#reporters-feed");
    const ok = results.filter((r) => r.status === "fulfilled").length;
    if (!posts.length) {
      feed.innerHTML = emptyFeed(ok ? "Quiet press box so far." : "Could not reach Bluesky. Check the connection; the links below still work.",
        D.x.reporters.map((r) => ({ label: "@" + r.handle, href: "https://x.com/" + r.handle })));
      return;
    }
    feed.innerHTML = posts.slice(0, 40).map((p) => postHtml(p, p._badge)).join("");
    $("#reporters-foot").innerHTML = R.map((r) => `<a class="btn small" href="https://bsky.app/profile/${esc(r.handle)}" target="_blank" rel="noopener">${esc(r.who.split(",")[0])}</a>`).join("");
    renderPhotos();
  }

  // ---- photo wall: every image we've seen, newest first
  async function loadPhotos(force) {
    if (!visible() && !force) return;
    const F = D.bluesky.feeds;
    const res = await Promise.allSettled(F.map((f) => feedPosts(f.uri, 50)));
    res.forEach((r, i) => { if (r.status === "fulfilled") chatter.cache[F[i].uri] = r.value; });
    renderPhotos();
  }
  function renderPhotos() {
    const seen = new Set();
    const all = [];
    Object.values(chatter.cache).flat().concat(reporterPosts).forEach((p) => {
      if (seen.has(p.uri)) return;
      seen.add(p.uri);
      const imgs = postImages(p);
      if (imgs.length) all.push({ p, imgs });
    });
    all.sort((a, b) => new Date(b.p.record.createdAt) - new Date(a.p.record.createdAt));
    const wall = $("#photowall");
    if (!all.length) {
      wall.innerHTML = emptyFeed("No photos have come through yet. They show up here as people post them.", [{ label: "Photos on X", href: D.links.xSearch("brewers parade filter:media") }]);
      return;
    }
    wall.innerHTML = all.slice(0, 60).map(({ p, imgs }) =>
      `<a href="${esc(postUrl(p))}" target="_blank" rel="noopener" title="${esc(p.record.text || "")}"><img src="${esc(imgs[0].thumb)}" alt="${esc(imgs[0].alt || "")}" loading="lazy"><span>@${esc(p.author.handle)}</span></a>`).join("");
  }

  // =========================================================================
  // Traffic cameras
  // =========================================================================
  let showAllCams = false;
  function renderCams() {
    const list = showAllCams ? D.cams : D.cams.filter((c) => c.featured);
    const t = Date.now();
    $("#cam-grid").innerHTML = list.map((c) =>
      `<a class="cam" href="${D.camImage(c.view)}" target="_blank" rel="noopener" title="Open full size"><img src="${D.camImage(c.view)}?t=${t}" alt="${esc(c.name)}" loading="lazy" onerror="this.alt='No image right now'"><figcaption>${esc(c.name)}</figcaption><span class="age">WisDOT</span></a>`).join("");
    $("#cams-stamp").textContent = "Frames fetched " + fmtTime(new Date());
    $("#cams-more").textContent = showAllCams ? "Show the 12 closest" : `Show all ${D.cams.length} cameras`;
  }
  function refreshCams() {
    if (!visible()) return;
    const t = Date.now();
    $$("#cam-grid img").forEach((img) => { img.src = img.src.split("?")[0] + "?t=" + t; });
    $("#cams-stamp").textContent = "Frames fetched " + fmtTime(new Date());
  }
  function setupCams() {
    renderCams();
    $("#cams-more").addEventListener("click", () => { showAllCams = !showAllCams; renderCams(); });
    $("#cams-refresh").addEventListener("click", refreshCams);
  }

  // =========================================================================
  // Waze, X embed, link lists
  // =========================================================================
  function setupWaze() {
    $("#waze-frame").innerHTML = '<iframe src="https://embed.waze.com/iframe?zoom=15&lat=43.0355&lon=-87.9060&ct=livemap&pin=1" loading="lazy" title="Waze live traffic map of downtown Milwaukee" allowfullscreen></iframe>';
  }
  function setupX() {
    $("#xembed").innerHTML = `<a class="twitter-timeline" data-theme="dark" data-height="520" data-chrome="noheader nofooter transparent" data-dnt="true" href="https://twitter.com/${D.x.team}?ref_src=twsrc%5Etfw">Loading @${D.x.team}&hellip; if nothing appears, open @${D.x.team} on X &rarr;</a>`;
    const s = document.createElement("script");
    s.async = true; s.src = "https://platform.twitter.com/widgets.js"; s.charset = "utf-8";
    document.body.appendChild(s);
    const links = [];
    D.x.searches.forEach((q) => links.push({ href: D.links.xSearch(q.q), b: q.label, small: "Live search on X" }));
    links.push({ href: `https://x.com/${D.x.team}`, b: "@" + D.x.team, small: "The team's account" });
    D.x.reporters.forEach((r) => links.push({ href: `https://x.com/${r.handle}`, b: "@" + r.handle, small: r.who }));
    $("#x-links").innerHTML = links.map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener"><span><b>${esc(l.b)}</b><small>${esc(l.small)}</small></span><span class="go">&rarr;</span></a>`).join("");
  }

  // =========================================================================
  // Confetti in team colors
  // =========================================================================
  const canvas = $("#confetti");
  const ctx = canvas.getContext("2d");
  let pieces = [], raf = null;
  function sizeCanvas() { canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); }
  function burst(n) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    sizeCanvas();
    const colors = ["#ffc52f", "#ffffff", "#12284b", "#ffd966", "#1d3a6b"];
    for (let i = 0; i < n; i++) {
      pieces.push({
        x: innerWidth / 2 + (Math.random() - 0.5) * innerWidth * 0.6, y: -20 - Math.random() * innerHeight * 0.3,
        vx: (Math.random() - 0.5) * 6, vy: 2 + Math.random() * 5, w: 6 + Math.random() * 8, h: 4 + Math.random() * 6,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, color: colors[(Math.random() * colors.length) | 0],
      });
    }
    if (!raf) raf = requestAnimationFrame(drawConfetti);
  }
  function drawConfetti() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    pieces = pieces.filter((p) => p.y < innerHeight + 30);
    for (const p of pieces) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.vx *= 0.995; p.rot += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    }
    raf = pieces.length ? requestAnimationFrame(drawConfetti) : null;
  }
  $("#confetti-btn").addEventListener("click", () => burst(220));
  window.addEventListener("resize", () => { if (pieces.length) sizeCanvas(); });

  // =========================================================================
  // Boot
  // =========================================================================
  function boot() {
    setupTiles();
    tickClock(); setInterval(tickClock, 1000);
    loadWeather(); setInterval(loadWeather, 10 * 60 * 1000);
    setupVideo();
    try { setupMap(); } catch (e) { console.error("map", e); }
    setInterval(updateTracker, 10 * 1000);
    setupChatter(); setInterval(() => loadChatter(false), 90 * 1000);
    loadReporters(true); setInterval(() => loadReporters(false), 90 * 1000);
    loadPhotos(true); setInterval(() => loadPhotos(false), 3 * 60 * 1000);
    setupCams(); setInterval(refreshCams, 2 * 60 * 1000);
    setupWaze();
    setupX();
    document.addEventListener("visibilitychange", () => { if (visible()) { tickClock(); refreshCams(); loadChatter(true); loadReporters(true); } });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
